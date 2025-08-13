import crypto from 'node:crypto';
import { CallbackContext, Jwk, SignJwtCallback } from '@openid4vc/oauth2';
import { digest, ES256 } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { kbPayload } from '@sd-jwt/types';
import {
    calculateJwkThumbprint,
    exportJWK,
    importJWK,
    importX509,
    JWK,
    jwtVerify,
    SignJWT,
} from 'jose';

export async function preparePresentation(kb: Omit<kbPayload, 'sd_hash'>) {
    const credential = {
        privateKey: {
            kty: 'EC',
            x: 'pv6VuyKohSPc_hXjsprf7JY6rKmzibk40v5Dlrd6-A0',
            y: 'foM8SQPpA3f0gK-KnU_1PsJ99xKt014OjGACMhtivo4',
            crv: 'P-256',
            d: 'KD7JHa_Mt1AX3peUJRySjJzr3dtdCy552y8HBYjEurw',
        },
        credential:
            'eyJ0eXAiOiJkYytzZC1qd3QiLCJ4NWMiOlsiTUlJQmZUQ0NBU1NnQXdJQkFnSVVSWU5HbkI2eGlicTNLS2cwaEVMa2ZYbFdURjh3Q2dZSUtvWkl6ajBFQXdJd0VqRVFNQTRHQTFVRUF3d0hSVlZFU1ZCTVR6QWVGdzB5TlRBM01qVXlNVFU1TURCYUZ3MHlOakEzTWpVeU1UVTVNREJhTUJJeEVEQU9CZ05WQkFNTUIwVlZSRWxRVEU4d1dUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFRRE05Uk80U3BjZS90N2FIREEwV1lHL3BmeGM2OHlBM3E4eDBsa0dEbzAwWTBXOE9yRVAweXJHTUozMHpLSGVuNytoRSs2NkV4Vk1wRitRRi9JTWJRc28xZ3dWakFVQmdOVkhSRUVEVEFMZ2dsc2IyTmhiR2h2YzNRd0hRWURWUjBPQkJZRUZOUms5Y3VtUm1kdXBGZDJhWGtDTlhMcnhDVFBNQjhHQTFVZEl3UVlNQmFBRkZET1A1dmtXdkplQmlpeU1iUUNDQmVOT0ZaVE1Bb0dDQ3FHU000OUJBTUNBMGNBTUVRQ0lDRWNwTVhhbURmdWFBWWRVYnZBWHFsc2xkMjFPd3JxSkdBaWlUSCtqaGZEQWlBTnh1dmJzZlZtWE84aHN4QnpaZ0FxQVJnZGZKaWtYOUNHbnZ2cDlVdjU3QT09Il0sImFsZyI6IkVTMjU2In0.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJpYXQiOjE3NTM0ODExNDAsInZjdCI6Imh0dHA6Ly9sb2NhbGhvc3Q6MzAwMC9yb290L2NyZWRlbnRpYWxzL3ZjdC9waWQiLCJjbmYiOnsiandrIjp7Imt0eSI6IkVDIiwiY3J2IjoiUC0yNTYiLCJ4IjoicHY2VnV5S29oU1BjX2hYanNwcmY3Slk2ckttemliazQwdjVEbHJkNi1BMCIsInkiOiJmb004U1FQcEEzZjBnSy1LblVfMVBzSjk5eEt0MDE0T2pHQUNNaHRpdm80In19LCJzdGF0dXMiOnsic3RhdHVzX2xpc3QiOnsiaWR4Ijo2NTA2LCJ1cmkiOiJodHRwOi9sb2NhbGhvc3Q6MzAwMC9yb290L3N0YXR1cy1tYW5hZ2VtZW50L3N0YXR1cy1saXN0In19LCJfc2QiOlsiLW1NMUI5azRnbjljX3B0aGlWSy0tX0RJN3lMZ3EzUVJaeDc1LW1LbTgxOCIsIjFlUms0bHYzVUpWN3V4N25NNU5uU3hrU0FDeHc4c2xPMjFkSGFRcXZxQjQiLCI0Z1A0YnJJbmt1ei1ZM2ROaWEwb1Y4U3o3ZVFJY1Z1RGpVdFU3UW9FczdNIiwiODVsRGVHeU5VSGRUSjE5cUlfOHZ4R3d1Sms3ejFMMldsM2syZlNjTnNXayIsIjlteDlta2ZESlhpNXJLVUtpMG11SHJtcDdGRURIczJIazNmbktFcTd5aFEiLCJNMl8yelI2a3JwMHNaWThOT0puTFp3Z0ducE1wMGEyUXZFNXhmNWRCSUJVIiwiUkZhbVpmVlVDZDVlOUplQU5rUHFHM21IaThBdTY0WnBQNGw1ZnNrdnJpayIsImF6OXRvSGFMNXlNVXd6cThQVE96enVkV1F6bjBVX0g4Q0xjOE11ZVJYRVkiLCJiUVQwWm1QNXE2OGsybmRfZThDb1AxbW5PX1BDMG43NTU2Sl9zNnExR3FjIiwiZDMxaU05UDNqNWxtQ28tSkZBeGVkZ19KOXpzOHJUWmhUNXVsWEN1YVVxNCIsInJPOW56cmNEQkYwTm5Fc0pScTA5bzg5Yk0xNG1RRUd6bEU4Y1FrX3JrSEUiLCJzLW9UdGhkTVd4TmJEQm9fbVlPWmdyYXdtNnpZMFRPT0hmallmOE45c0JZIl0sIl9zZF9hbGciOiJzaGEtMjU2In0.bJofefUpxRRPTX8X6kUh8Bw1ke0pBwiqxEnxD52rGFhPrvPFUkdW10wH3Gd8w2q8L7Vab7whqh71IL2hDy67Bg~WyJhZjlmNTZhNWUyY2UzMzc5IiwibG9jYWxpdHkiLCJLw5ZMTiJd~WyJiMTE3YTAyZTFjN2MyNDJmIiwicG9zdGFsX2NvZGUiLCI1MTE0NyJd~WyJiMTcyYTY0Y2IwYzMzZmU4Iiwic3RyZWV0X2FkZHJlc3MiLCJIRUlERVNUUkHhup5FIDE3Il0~WyIzMmZlZjQwNDNiODgzNzAwIiwiaXNzdWluZ19jb3VudHJ5IiwiREUiXQ~WyI5NDA2MTc1OWYxOTMxYTQ1IiwiaXNzdWluZ19hdXRob3JpdHkiLCJERSJd~WyI5NGE3ZjMyZTU5NmJkMmU0IiwiZ2l2ZW5fbmFtZSIsIkVSSUtBIl0~WyIwNGQzMGY2ODlkOTE5MGJkIiwiZmFtaWx5X25hbWUiLCJNVVNURVJNQU5OIl0~WyJkNDA1YmVmMzZhMWI1Yzc4IiwiYmlydGhfZmFtaWx5X25hbWUiLCJHQUJMRVIiXQ~WyIyZTA5YzFmYTc1OGNmYjczIiwiYmlydGhkYXRlIiwiMTk2NC0wOC0xMiJd~WyJkMGI5ODEwZThmMDNiZTE4IiwiYWdlX2JpcnRoX3llYXIiLDE5NjRd~WyI1OWRjY2VhYTZlNDFjOWIxIiwiYWdlX2luX3llYXJzIiw1OV0~WyJiMmEwN2QyYjhiZjVhZTA2IiwiYWdlX2VxdWFsX29yX292ZXIiLHsiMTIiOnRydWUsIjE0Ijp0cnVlLCIxNiI6dHJ1ZSwiMTgiOnRydWUsIjIxIjp0cnVlLCI2NSI6ZmFsc2V9XQ~WyIyN2RlYzE5Yzc4Mzk4NTdlIiwicGxhY2Vfb2ZfYmlydGgiLHsibG9jYWxpdHkiOiJCRVJMSU4ifV0~WyJkYTgzMzg4NDU1ZWYwMThmIiwiYWRkcmVzcyIseyJfc2QiOlsiVS1yUkJvTmlhdS16dktEeDJXaFAwTjVnOFZ1WC11OGJMYXlZVWU1bUF5byIsIlhTblpFb0M3SXItUmJNa3lCWXJPeVFKS1NVMF9zZlJJdnJfYW1lMVpJNDQiLCJ6TDJzLWZTTmNZN3RvZmxrZUd4cDdScGJQWFRJYm03WnZVRmQyU3JoOUdzIl19XQ~WyIxMjdkZDBhMWNmMjRhNDk3IiwibmF0aW9uYWxpdGllcyIsWyJERSJdXQ~',
    };

    const sdjwt = new SDJwtVcInstance({
        hasher: digest,
        kbSigner: await ES256.getSigner(credential.privateKey),
        kbSignAlg: 'ES256',
    });
    const presentation = await sdjwt.present(
        credential.credential,
        {
            birthdate: true,
            address: {
                locality: true,
            },
        },
        {
            kb: {
                payload: kb,
            },
        },
    );
    return presentation;
}

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
        } catch (_error) {
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
