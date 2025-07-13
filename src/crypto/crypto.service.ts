import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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

type certificateType = 'access' | 'signing';

@Injectable()
export class CryptoService implements OnModuleInit {
    folder: string;

    constructor(
        private readonly configService: ConfigService,
        @Inject('KeyService') public readonly keyService: KeyService,
    ) {}
    onModuleInit() {
        this.folder = join(
            this.configService.getOrThrow<string>('FOLDER'),
            'keys',
        );
        if (!existsSync(this.folder)) {
            mkdirSync(this.folder, { recursive: true });
        }
    }

    getCertChain(type: certificateType = 'signing') {
        const cert = readFileSync(
            join(this.folder, `${type}-certificate.pem`),
            'utf-8',
        )
            .replace('-----BEGIN CERTIFICATE-----', '')
            .replace('-----END CERTIFICATE-----', '')
            .replace(/\r?\n|\r/g, '');
        return [cert];
    }

    storeAccessCertificate(crt: string) {
        writeFileSync(join(this.folder, `access-certificate.pem`), crt);
    }

    async signJwt(header: any, payload: any): Promise<string> {
        return this.keyService.signJWT(payload, header);
    }

    async verifyJwt(
        compact: string,
        payload?: Record<string, any>,
    ): Promise<{ verified: boolean }> {
        const publicJwk = await this.keyService.getPublicKey('jwk');
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

    // Callbacks object similar to your utils
    callbacks: Omit<CallbackContext, 'encryptJwe' | 'decryptJwe'> = {
        hash: (data, alg) =>
            createHash(alg.replace('-', '').toLowerCase())
                .update(data)
                .digest(),
        generateRandom: (bytes) => randomBytes(bytes),
        clientAuthentication: clientAuthenticationNone({
            clientId: 'some-random',
        }),
        //clientId: 'some-random-client-id', // TODO: Replace with your real clientId if necessary
        signJwt: this.getSignJwtCallback(),
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

    // Helper to generate signJwt callback
    getSignJwtCallback(): SignJwtCallback {
        return async (signer, { header, payload }) => {
            if (signer.method !== 'jwk') {
                throw new Error('Signer method not supported');
            }

            const jwkThumbprint = await calculateJwkThumbprint({
                jwk: signer.publicJwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback: this.callbacks.hash,
            });

            const privateThumbprint = await calculateJwkThumbprint({
                jwk: (await this.keyService.getPublicKey('jwk')) as Jwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback: this.callbacks.hash,
            });

            if (jwkThumbprint !== privateThumbprint) {
                throw new Error(
                    `No private key available for public jwk \n${JSON.stringify(signer.publicJwk, null, 2)}`,
                );
            }

            const jwt = await this.signJwt(header, payload);

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

    getJwks() {
        return this.keyService.getPublicKey('jwk') as Promise<EC_Public>;
    }
}
