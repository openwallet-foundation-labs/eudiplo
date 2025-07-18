import { createHash, randomBytes, X509Certificate } from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    unlinkSync,
    writeFileSync,
} from 'node:fs';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import {
    type CallbackContext,
    HashAlgorithm,
    type Jwk,
    SignJwtCallback,
    calculateJwkThumbprint,
    clientAuthenticationNone,
} from '@openid4vc/oauth2';
import type { Request } from 'express';
import { type JWK, importJWK, jwtVerify } from 'jose';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { KeyService } from './key/key.service';
import { EC_Public } from '../well-known/dto/jwks-response.dto';
import { execSync } from 'node:child_process';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { TENANT_EVENTS } from '../auth/tenant-events';

type certificateType = 'access' | 'signing';

@Injectable()
export class CryptoService implements OnModuleInit {
    folder: string;

    constructor(
        private readonly configService: ConfigService,
        @Inject('KeyService') public readonly keyService: KeyService,
        private readonly eventEmitter: EventEmitter2,
    ) {}
    onModuleInit() {
        this.folder = join(this.configService.getOrThrow<string>('FOLDER'));
        if (!existsSync(this.folder)) {
            mkdirSync(this.folder, { recursive: true });
        }
    }

    @OnEvent(TENANT_EVENTS.TENANT_INIT, { async: true })
    async onTenantInit(tenantId: string) {
        const folder = join(this.folder, tenantId, 'keys');
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        await this.keyService.init(tenantId);
        this.hasCerts(tenantId);
        this.eventEmitter.emit(TENANT_EVENTS.TENANT_KEYS, tenantId);
    }

    /**
     * Checks if there is a signing certificate and access certificate available.
     * If not it will be created.
     */
    hasCerts(tenantId: string) {
        const folder = join(this.folder, tenantId, 'keys');
        const pubkey = join(folder, 'public-key.pem');
        const dummyKey = join(folder, 'dummy_key.pem');
        const dummyCsr = join(folder, 'dummy.csr');
        const issuerKey = join(folder, 'issuer_key.pem');
        const issuerCert = join(folder, 'issuer_cert.pem');
        const certOut = join(folder, 'signing-certificate.pem');
        const sanExt = join(folder, 'san.ext');
        if (!existsSync(certOut)) {
            // === Configurable parameters (you can parameterize these when calling the script) ===
            const subject = this.configService.getOrThrow<string>('RP_NAME');
            const uri = this.configService
                .getOrThrow<string>('PUBLIC_URL')
                .replace('https://', '');

            // === Helper to run shell commands ===
            const run = (cmd) => {
                execSync(cmd, { stdio: 'inherit' });
            };

            // === Step-by-step ===
            mkdirSync(this.folder, { recursive: true });

            // Step 1: Create dummy key pair if public key is missing
            if (!existsSync(dummyKey)) {
                // Generate private key (PKCS#8)
                run(
                    `openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out "${dummyKey}"`,
                );
            } else {
                if (!existsSync(dummyKey)) {
                    throw new Error(
                        `Public key exists but ${dummyKey} is missing.`,
                    );
                }
            }

            // Step 2: Generate issuer key
            run(
                `openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:prime256v1 -out "${issuerKey}"`,
            );

            // Step 3: Create self-signed issuer cert
            run(
                `openssl req -x509 -new -key "${issuerKey}" -subj "/CN=${subject}" -addext "subjectAltName=DNS:${uri}" -days 365 -out "${issuerCert}"`,
            );

            // Step 4: Create dummy CSR
            run(
                `openssl req -new -key "${dummyKey}" -subj "/CN=${subject}" -addext "subjectAltName=DNS:${uri}" -out "${dummyCsr}"`,
            );

            // Step 5: Create SAN extension file
            writeFileSync(sanExt, `subjectAltName=DNS:${uri}`);

            // Step 6: Sign certificate using issuer
            run(
                `openssl x509 -req -in "${dummyCsr}" -force_pubkey "${pubkey}" -CA "${issuerCert}" -CAkey "${issuerKey}" -CAcreateserial -days 365 -extfile "${sanExt}" -out "${certOut}"`,
            );

            // Step 7: Clean up
            [
                issuerKey,
                issuerCert,
                dummyCsr,
                dummyKey,
                join(folder, 'issuer_cert.srl'),
                sanExt,
            ].forEach((file) => {
                if (existsSync(file)) unlinkSync(file);
            });
        }
        if (!existsSync(join(folder, 'access-certificate.pem'))) {
            // Create access certificate from signing certificate
            const signingCert = readFileSync(
                join(folder, 'signing-certificate.pem'),
                'utf-8',
            );
            writeFileSync(join(folder, 'access-certificate.pem'), signingCert);
        }
    }

    getCertChain(type: certificateType = 'signing', tenantId: string) {
        const cert = readFileSync(
            join(this.folder, tenantId, 'keys', `${type}-certificate.pem`),
            'utf-8',
        );
        const crt = new X509Certificate(cert);
        console.log(crt.subjectAltName);

        const chain = cert
            .replace('-----BEGIN CERTIFICATE-----', '')
            .replace('-----END CERTIFICATE-----', '')
            .replace(/\r?\n|\r/g, '');
        return [chain];
    }

    storeAccessCertificate(crt: string, tenantId: string) {
        writeFileSync(
            join(this.folder, tenantId, 'keys', `access-certificate.pem`),
            crt,
        );
    }

    async signJwt(
        header: any,
        payload: any,
        tenantId: string,
    ): Promise<string> {
        return this.keyService.signJWT(payload, header, tenantId);
    }

    async verifyJwt(
        compact: string,
        tenantId: string,
        payload?: Record<string, any>,
    ): Promise<{ verified: boolean }> {
        const publicJwk = await this.keyService.getPublicKey('jwk', tenantId);
        const publicCryptoKey = await importJWK(publicJwk, 'ES256');

        try {
            await jwtVerify(compact, publicCryptoKey, {
                currentDate: payload?.exp
                    ? new Date((payload.exp - 300) * 1000)
                    : undefined,
            });
            return { verified: true };
        } catch {
            return { verified: false };
        }
    }
    getCallbackContext(
        tenantId: string,
    ): Omit<CallbackContext, 'encryptJwe' | 'decryptJwe'> {
        return {
            hash: (data, alg) =>
                createHash(alg.replace('-', '').toLowerCase())
                    .update(data)
                    .digest(),
            generateRandom: (bytes) => randomBytes(bytes),
            clientAuthentication: clientAuthenticationNone({
                clientId: 'some-random',
            }),
            //clientId: 'some-random-client-id', // TODO: Replace with your real clientId if necessary
            signJwt: this.getSignJwtCallback(tenantId),
            verifyJwt: async (signer, { compact, payload }) => {
                if (signer.method !== 'jwk') {
                    throw new Error('Signer method not supported');
                }

                const josePublicKey = await importJWK(
                    signer.publicJwk as JWK,
                    signer.alg,
                );
                try {
                    await jwtVerify(compact, josePublicKey, {
                        currentDate: payload?.exp
                            ? new Date((payload.exp - 300) * 1000)
                            : undefined,
                    });
                    return { verified: true, signerJwk: signer.publicJwk };
                } catch {
                    return { verified: false };
                }
            },
        };
    }

    // Helper to generate signJwt callback
    getSignJwtCallback(tenantId: string): SignJwtCallback {
        return async (signer, { header, payload }) => {
            if (signer.method !== 'jwk') {
                throw new Error('Signer method not supported');
            }
            const hashCallback = this.getCallbackContext(tenantId).hash;
            const jwkThumbprint = await calculateJwkThumbprint({
                jwk: signer.publicJwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback,
            });

            const privateThumbprint = await calculateJwkThumbprint({
                jwk: (await this.keyService.getPublicKey(
                    'jwk',
                    tenantId,
                )) as Jwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback,
            });

            if (jwkThumbprint !== privateThumbprint) {
                throw new Error(
                    `No private key available for public jwk \n${JSON.stringify(signer.publicJwk, null, 2)}`,
                );
            }

            const jwt = await this.signJwt(header, payload, tenantId);

            return {
                jwt,
                signerJwk: signer.publicJwk,
            };
        };
    }

    // Utility method like in your utils.ts
    getHeadersFromRequest(req: Request): globalThis.Headers {
        const headers = new Headers();
        for (const [key, value] of Object.entries(req.headers)) {
            if (Array.isArray(value)) {
                for (const v of value) {
                    headers.append(key, v);
                }
            } else if (value !== undefined) {
                headers.set(key, value);
            }
        }
        return headers;
    }

    getJwks(tenantId: string) {
        return this.keyService.getPublicKey(
            'jwk',
            tenantId,
        ) as Promise<EC_Public>;
    }
}
