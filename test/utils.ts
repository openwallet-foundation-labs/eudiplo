import { CallbackContext, Jwk, SignJwtCallback } from '@openid4vc/oauth2';
import { decodeBase64, encodeToUtf8String } from '@openid4vc/utils';
import {
    calculateJwkThumbprint,
    importJWK,
    JWK,
    jwtVerify,
    SignJWT,
} from 'jose';
import crypto from 'node:crypto';

export const callbacks = {
    hash: (data, alg) =>
        crypto
            .createHash(alg.replace('-', '').toLowerCase())
            .update(data)
            .digest(),
    generateRandom: (bytes) => crypto.randomBytes(bytes),
    /* clientAuthentication: clientAuthenticationNone({
        clientId: 'some-random-client-id',
    }), */
    verifyJwt: async (signer, { compact, payload }) => {
        let jwk: Jwk;
        if (signer.method === 'did') {
            jwk = JSON.parse(
                encodeToUtf8String(
                    decodeBase64(
                        signer.didUrl.split('#')[0].replace('did:jwk:', ''),
                    ),
                ),
            );
        } else if (signer.method === 'jwk') {
            jwk = signer.publicJwk;
        } else {
            throw new Error('Signer method not supported');
        }

        const josePublicKey = await importJWK(jwk as JWK, signer.alg);
        try {
            await jwtVerify(compact, josePublicKey, {
                currentDate: payload.exp
                    ? new Date((payload.exp - 300) * 1000)
                    : undefined,
            });
            return {
                verified: true,
                signerJwk: jwk,
            };
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            return {
                verified: false,
            };
        }
    },
} as const satisfies Partial<CallbackContext>;

export const getSignJwtCallback = (privateJwks: Jwk[]): SignJwtCallback => {
    return async (signer, { header, payload }) => {
        let jwk: Jwk;
        if (signer.method === 'did') {
            jwk = JSON.parse(
                encodeToUtf8String(
                    decodeBase64(
                        signer.didUrl.split('#')[0].replace('did:jwk:', ''),
                    ),
                ),
            );
        } else if (signer.method === 'jwk') {
            jwk = signer.publicJwk;
        } else {
            throw new Error('Signer method not supported');
        }

        const jwkThumprint = await calculateJwkThumbprint(jwk as JWK, 'sha256');

        const privateJwk = await Promise.all(
            privateJwks.map(async (jwk) =>
                (await calculateJwkThumbprint(jwk as JWK, 'sha256')) ===
                jwkThumprint
                    ? jwk
                    : undefined,
            ),
        ).then((jwks) => jwks.find((jwk) => jwk !== undefined));

        if (!privateJwk) {
            throw new Error(
                `No private key available for public jwk \n${JSON.stringify(jwk, null, 2)}`,
            );
        }

        const josePrivateKey = await importJWK(privateJwk as JWK, signer.alg);
        const jwt = await new SignJWT(payload)
            .setProtectedHeader(header)
            .sign(josePrivateKey);

        return {
            jwt: jwt,
            signerJwk: jwk,
        };
    };
};
