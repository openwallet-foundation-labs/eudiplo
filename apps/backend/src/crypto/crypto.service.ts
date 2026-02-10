import { createHash, randomBytes } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import {
    type CallbackContext,
    calculateJwkThumbprint,
    clientAuthenticationNone,
    HashAlgorithm,
    type Jwk,
    SignJwtCallback,
} from "@openid4vc/oauth2";
import { exportJWK, importJWK, importX509, type JWK, jwtVerify } from "jose";
import { KeyService } from "./key/key.service";

/**
 * Service for cryptographic operations, including key management and certificate handling.
 */
@Injectable()
export class CryptoService {
    /**
     * Folder where the keys are stored.
     */
    folder!: string;

    /**
     * Constructor for CryptoService.
     * @param keyService
     */
    constructor(@Inject("KeyService") public readonly keyService: KeyService) {}

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
        const publicJwk = await this.keyService.getPublicKey("jwk", tenantId);
        const publicCryptoKey = await importJWK(publicJwk, "ES256");

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
    ): Omit<CallbackContext, "encryptJwe" | "decryptJwe"> {
        return {
            hash: (data, alg) =>
                createHash(alg.replace("-", "").toLowerCase())
                    .update(data)
                    .digest(),
            generateRandom: (bytes) => randomBytes(bytes),
            clientAuthentication: clientAuthenticationNone({
                clientId: "some-random",
            }),
            //clientId: 'some-random-client-id', // TODO: Replace with your real clientId if necessary
            signJwt: this.getSignJwtCallback(tenantId),
            verifyJwt: async (signer, { compact, payload }) => {
                if (signer.method === "jwk") {
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
                } else if (signer.method === "x5c") {
                    // x5c contains an array of base64-encoded X.509 certificates
                    // The first certificate (leaf) contains the public key
                    if (!signer.x5c || signer.x5c.length === 0) {
                        return { verified: false };
                    }
                    try {
                        const leafCertPem = `-----BEGIN CERTIFICATE-----\n${signer.x5c[0]}\n-----END CERTIFICATE-----`;
                        const josePublicKey = await importX509(
                            leafCertPem,
                            signer.alg,
                        );
                        await jwtVerify(compact, josePublicKey, {
                            currentDate: payload?.exp
                                ? new Date((payload.exp - 300) * 1000)
                                : undefined,
                        });
                        // Extract the public JWK from the certificate for the return value
                        const signerJwk = await exportJWK(josePublicKey);
                        signerJwk.alg = signer.alg;
                        return { verified: true, signerJwk: signerJwk as Jwk };
                    } catch {
                        return { verified: false };
                    }
                }
                throw new Error(
                    `Signer method '${signer.method}' not supported`,
                );
            },
        };
    }

    // Helper to generate signJwt callback
    getSignJwtCallback(tenantId: string): SignJwtCallback {
        return async (signer, { header, payload }) => {
            if (signer.method !== "jwk") {
                throw new Error("Signer method not supported");
            }
            const hashCallback = this.getCallbackContext(tenantId).hash;
            const jwkThumbprint = await calculateJwkThumbprint({
                jwk: signer.publicJwk,
                hashAlgorithm: HashAlgorithm.Sha256,
                hashCallback,
            });

            const privateThumbprint = await calculateJwkThumbprint({
                jwk: (await this.keyService.getPublicKey(
                    "jwk",
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

            const jwt = await this.keyService.signJWT(
                payload,
                header,
                tenantId,
            );

            return {
                jwt,
                signerJwk: signer.publicJwk,
            };
        };
    }
}
