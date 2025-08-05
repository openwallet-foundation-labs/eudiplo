import { createHash, randomBytes } from 'node:crypto';
import {
    existsSync,
    mkdirSync,
    readFileSync,
    rmSync,
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
import { type JWK, importJWK, jwtVerify } from 'jose';
import { ConfigService } from '@nestjs/config';
import { join } from 'node:path';
import { KeyService } from './key/key.service';
import { EC_Public } from '../well-known/dto/jwks-response.dto';
import { execSync } from 'node:child_process';
import { KeyImportDto } from './key/dto/key-import.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm/repository/Repository';
import { CertEntity } from './key/entities/cert.entity';

type certificateType = 'access' | 'signing';

@Injectable()
export class CryptoService implements OnModuleInit {
    folder: string;

    constructor(
        private readonly configService: ConfigService,
        @Inject('KeyService') public readonly keyService: KeyService,
        @InjectRepository(CertEntity)
        private certRepository: Repository<CertEntity>,
    ) {}
    onModuleInit() {
        this.folder = join(this.configService.getOrThrow<string>('FOLDER'));
        if (!existsSync(this.folder)) {
            mkdirSync(this.folder, { recursive: true });
        }
    }

    async onTenantInit(tenantId: string) {
        const folder = join(this.folder, tenantId, 'keys');
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        await this.keyService.init(tenantId);
        await this.hasCerts(tenantId);
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getAlgorithm(tenantId: string): string {
        //TODO: implement logic to fetch algorithm for the tenant
        return 'ES256';
    }

    /**
     * Imports a key into the key service.
     * @param tenantId
     * @param body
     * @returns
     */
    async importKey(tenantId: string, body: KeyImportDto): Promise<string> {
        const keyId = await this.keyService.import(tenantId, body);
        // If the private key has a certificate, write it to the certs folder
        if (body.crt) {
            await this.certRepository.save({
                tenantId,
                keyId,
                crt: body.crt,
            });
        } else {
            // If no certificate is provided, generate a self-signed certificate
            await this.hasCerts(tenantId, keyId);
        }
        return keyId;
    }

    /**
     * Checks if there is a signing certificate and access certificate available.
     * If not it will be created.
     */
    async hasCerts(tenantId: string, keyId?: string) {
        keyId = keyId || (await this.keyService.getKid(tenantId));

        const certObj = await this.certRepository.findOneBy({
            tenantId,
            keyId,
        });

        //when there is no cert, create one
        if (certObj?.crt) {
            return;
        }

        const publicKey = await this.keyService.getPublicKey(
            'pem',
            tenantId,
            keyId,
        );

        const folder = join(this.folder, tenantId, keyId);
        // create a temporary folder for the cert generation
        if (!existsSync(folder)) {
            mkdirSync(folder, { recursive: true });
        }
        const publicKeyPath = join(folder, `public-key.${keyId}.pem`);
        writeFileSync(publicKeyPath, publicKey);
        const dummyKey = join(folder, 'dummy_key.pem');
        const dummyCsr = join(folder, 'dummy.csr');
        const issuerKey = join(folder, 'issuer_key.pem');
        const issuerCert = join(folder, 'issuer_cert.pem');

        const certOut = join(folder, `${keyId}.pem`);
        const sanExt = join(folder, 'san.ext');

        // === Configurable parameters (you can parameterize these when calling the script) ===
        const subject = this.configService.getOrThrow<string>('RP_NAME');
        const hostname = new URL(
            this.configService.getOrThrow<string>('PUBLIC_URL'),
        ).hostname; // Use URL to parse and get hostname

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
            `openssl req -x509 -new -key "${issuerKey}" -subj "/CN=${subject}" -addext "subjectAltName=DNS:${hostname}" -days 365 -out "${issuerCert}"`,
        );

        // Step 4: Create dummy CSR
        run(
            `openssl req -new -key "${dummyKey}" -subj "/CN=${subject}" -addext "subjectAltName=DNS:${hostname}" -out "${dummyCsr}"`,
        );

        // Step 5: Create SAN extension file
        writeFileSync(sanExt, `subjectAltName=DNS:${hostname}`);

        // Step 6: Sign certificate using issuer
        run(
            `openssl x509 -req -in "${dummyCsr}" -force_pubkey "${publicKeyPath}" -CA "${issuerCert}" -CAkey "${issuerKey}" -CAcreateserial -days 365 -extfile "${sanExt}" -out "${certOut}"`,
        );

        const crt = readFileSync(certOut, 'utf-8');
        // Store the certificate in the database
        await this.certRepository.save({
            tenantId,
            keyId,
            crt,
        });

        // Step 7: Clean up
        rmSync(folder, { recursive: true });

        const certFolder = join(this.folder, tenantId, 'keys');
        if (!existsSync(join(certFolder, 'access-certificate.pem'))) {
            // Create access certificate from signing certificate
            writeFileSync(join(certFolder, 'access-certificate.pem'), crt);
        }
    }

    getCert(tenantId: string, keyId: string): Promise<string> {
        return this.certRepository
            .findOneBy({ tenantId, keyId })
            .then((cert) => cert!.crt);
    }

    /**
     * Get the certificate chain for the given type to be included in the JWS header.
     * @param type
     * @param tenantId
     * @param keyId
     * @returns
     */
    async getCertChain(
        type: certificateType = 'signing',
        tenantId: string,
        keyId?: string,
    ) {
        keyId = keyId || (await this.keyService.getKid(tenantId));
        let cert: string;
        if (type === 'signing') {
            cert = await this.getCert(tenantId, keyId);
        } else {
            cert = readFileSync(
                join(this.folder, tenantId, 'keys', `access-certificate.pem`),
                'utf-8',
            );
        }

        const chain = cert
            .replace('-----BEGIN CERTIFICATE-----', '')
            .replace('-----END CERTIFICATE-----', '')
            .replace(/\r?\n|\r/g, '');
        return [chain];
    }

    /**
     * Store the access certificate for the tenant.
     * @param crt
     * @param tenantId
     */
    storeAccessCertificate(crt: string, tenantId: string) {
        writeFileSync(
            join(this.folder, tenantId, 'keys', `access-certificate.pem`),
            crt,
        );
    }

    /**
     * Sign a JWT with the key service.
     * @param header
     * @param payload
     * @param tenantId
     * @returns
     */
    async signJwt(
        header: any,
        payload: any,
        tenantId: string,
    ): Promise<string> {
        return this.keyService.signJWT(payload, header, tenantId);
    }

    /**
     * Verify a JWT with the key service.
     * @param compact
     * @param tenantId
     * @param payload
     * @returns
     */
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
    /**
     * Get the callback context for the key service.
     * @param tenantId
     * @returns
     */
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

    /**
     * Get the JWKs for the tenant.
     * @param tenantId
     * @returns
     */
    getJwks(tenantId: string) {
        return this.keyService.getPublicKey(
            'jwk',
            tenantId,
        ) as Promise<EC_Public>;
    }

    /**
     * Delete a key from the key service and the cert.
     * @param tenantId
     * @param id
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    deleteKey(tenantId: string, id: string) {
        //TODO: before deleting it, make sure it is not used in a configuration
        throw new Error('Method not implemented.');
    }
}
