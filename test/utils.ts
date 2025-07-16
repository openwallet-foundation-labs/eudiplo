import { CallbackContext, Jwk, SignJwtCallback } from '@openid4vc/oauth2';
import crypto from 'node:crypto';
import { NextFunction, Request } from 'express';
import {
    calculateJwkThumbprint,
    exportJWK,
    importJWK,
    importX509,
    JWK,
    jwtVerify,
    SignJWT,
} from 'jose';

export const callbacks: any = {
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
        let publicKey: CryptoKey;
        if (signer.method === 'jwk') {
            jwk = signer.publicJwk;
            publicKey = (await importJWK(jwk as JWK, signer.alg)) as CryptoKey;
        } else if (signer.method === 'x5c') {
            const headerB64 = compact.split('.')[0];
            const header = JSON.parse(
                Buffer.from(headerB64, 'base64url').toString(),
            );
            const certPem = `-----BEGIN CERTIFICATE-----\n${header.x5c}\n-----END CERTIFICATE-----`;
            publicKey = await importX509(certPem, signer.alg);
            jwk = (await exportJWK(publicKey)) as Jwk;
        } else {
            throw new Error('Signer method not supported');
        }

        try {
            await jwtVerify(compact, publicKey, {
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
    getX509CertificateMetadata: (
        certificate: string,
    ): {
        sanDnsNames: string[];
        sanUriNames: string[];
    } => {
        const cert1 = new crypto.X509Certificate(
            `-----BEGIN CERTIFICATE-----\n${certificate}\n-----END CERTIFICATE-----`,
        );
        const sanDnsNames = cert1
            .subjectAltName!.split(',')
            .map((name) => name.replace('DNS:', '').trim());
        const sanUriNames = [];
        sanDnsNames.push('example.com');

        return {
            sanDnsNames,
            sanUriNames,
        };
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

export function loggerMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    console.log(`[${req.host}] ${req.originalUrl}`);
    if (req.body) {
        console.log(req.body);
    }
    next();
}
