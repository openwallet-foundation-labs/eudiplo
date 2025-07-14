/* eslint-disable @typescript-eslint/no-unsafe-return */
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
import { App } from 'supertest/types';
import request from 'supertest';
import Test from 'supertest/lib/test';

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
        if (signer.method === 'jwk') {
            jwk = signer.publicJwk;
        } else {
            throw new Error('Signer method not supported');
        }

        const jwkThumprint = await calculateJwkThumbprint(jwk as JWK, 'sha256');

        console.log(payload);

        // add cnf
        payload.cnf = {
            jkt: jwkThumprint,
        };

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

export /**
 *
 * @param input
 * @param init
 * @returns
 */
function createSupertestFetch(app: App): typeof fetch {
    return async (
        input: RequestInfo,
        init?: RequestInit,
    ): Promise<Response> => {
        const url = (input as string).split(':3000')[1];

        if (url === undefined) {
            // it seems it's not a local request, so we can use the default fetch
            return fetch(input, init);
        }
        const method = init?.method || 'GET';
        const headers = init?.headers || {};
        const body = init?.body;

        let test: Test = request(app)[method.toLowerCase()](url);

        // Handle different types of headers objects
        if (headers instanceof Headers) {
            // Web API Headers object
            headers.forEach((value, key) => {
                test = test.set(key, value);
            });
        } else {
            // Plain object or HeadersInit
            Object.entries(headers as Record<string, string>).forEach(
                ([key, value]) => {
                    test = test.set(key, value);
                },
            );
        }
        if (body) {
            test = test.send(body);
        }

        const res = await test;

        // Construct a Response-like object
        return {
            ok: res.status >= 200 && res.status < 300,
            status: res.status,
            statusText: res.statusType || '',
            headers: {
                get: (name: string) => res.header[name.toLowerCase()],
                has: (name: string) => name.toLowerCase() in res.header,
            } as Headers,
            // eslint-disable-next-line @typescript-eslint/require-await
            text: async () => res.text,
            // eslint-disable-next-line @typescript-eslint/require-await
            json: async () => res.body,
            // dummy stream for compatibility if needed
            body: null as any as ReadableStream<Uint8Array>,
            clone: () => {
                return {
                    ok: res.status >= 200 && res.status < 300,
                    status: res.status,
                    statusText: res.statusType || '',
                    headers: {
                        get: (name: string) => res.header[name.toLowerCase()],
                        has: (name: string) => name.toLowerCase() in res.header,
                    } as Headers,
                    // eslint-disable-next-line @typescript-eslint/require-await
                    text: async () => res.text,
                    // eslint-disable-next-line @typescript-eslint/require-await
                    json: async () => res.body,
                    body: null as any as ReadableStream<Uint8Array>,
                    clone: () => this.clone(),
                } as Response;
            },
            redirected: false,
            type: 'basic',
            url: url.toString(),
        } as unknown as Response;
    };
}

export function loggerMiddleware(req, res, next) {
    console.log(`[${req.method}] ${req.originalUrl}`);
    if (req.body) {
        console.log(req.body);
    }
    next();
}
