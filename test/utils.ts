import { CallbackContext, Jwk, SignJwtCallback } from '@openid4vc/oauth2';
import crypto from 'node:crypto';
import {
    calculateJwkThumbprint,
    exportJWK,
    importJWK,
    importX509,
    JWK,
    jwtVerify,
    SignJWT,
} from 'jose';
import { digest, ES256 } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { kbPayload } from '@sd-jwt/types';

export async function preparePresentation(kb: Omit<kbPayload, 'sd_hash'>) {
    const credential = {
        privateKey: {
            kty: 'EC',
            x: 'SJMle-U8ehikNHA3wSa6wX_Tw30efY8m_D9XGA-O5B4',
            y: '35mHt_s6lCyncCx_1hbv1a196usoa4uN_LbJFJaFO5w',
            crv: 'P-256',
            d: 'GJdC7wirSuxiZ9Ulg3Ha5JVVRDd_PF_1MPopaiHu_ag',
        },
        credential:
            'eyJ0eXAiOiJkYytzZC1qd3QiLCJ4NWMiOlsiTUlJQmhUQ0NBU3VnQXdJQkFnSVVLZTZFZUZUTlA1UC9sbk9ydTVHajhpUWJsWEl3Q2dZSUtvWkl6ajBFQXdJd0VqRVFNQTRHQTFVRUF3d0hSVlZFU1ZCTVR6QWVGdzB5TlRBM01qVXlNRFF4TXpaYUZ3MHlOakEzTWpVeU1EUXhNelphTUJJeEVEQU9CZ05WQkFNTUIwVlZSRWxRVEU4d1dUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFTZThwQUR0cjZJOGIwZEF3eGIwQllXUUpBYk4xVlp3Smw4SUx2RmVnMVZzZUtRVmRrVytuSEFEZWVobk0wUjVFNGZwWmJRWmY1blRYTXcxQnBjVjBnTG8xOHdYVEFiQmdOVkhSRUVGREFTZ2hCb2RIUndPaTh2Ykc5allXeG9iM04wTUIwR0ExVWREZ1FXQkJUV3FrQnM5azN5ZWRTMkpvNzFwdnlENzVFdkhqQWZCZ05WSFNNRUdEQVdnQlRWd0xXMzhkN3pGVlgyZ3YvT3FKTHhoTitOMURBS0JnZ3Foa2pPUFFRREFnTklBREJGQWlBNGVPNTFQYWNodTVFZUtIRGRnakdJQ21sSHF2U21LN3lIU285bDR4UHUrd0loQU40bVdEODF0elczbjQ2VTJBRzdWV3dOQUZVMWhRRnQ2N2dvcWN4K2hBSk8iXSwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwOi8vbG9jYWxob3N0IiwiaWF0IjoxNzUzNDc2ODc5LCJ2Y3QiOiJodHRwOi8vbG9jYWxob3N0L3Jvb3QvY3JlZGVudGlhbHMvdmN0L3BpZCIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsIngiOiJTSk1sZS1VOGVoaWtOSEEzd1NhNndYX1R3MzBlZlk4bV9EOVhHQS1PNUI0IiwieSI6IjM1bUh0X3M2bEN5bmNDeF8xaGJ2MWExOTZ1c29hNHVOX0xiSkZKYUZPNXcifX0sInN0YXR1cyI6eyJzdGF0dXNfbGlzdCI6eyJpZHgiOjk5MTQsInVyaSI6Imh0dHA6L2xvY2FsaG9zdC9yb290L3N0YXR1cy1tYW5hZ2VtZW50L3N0YXR1cy1saXN0In19LCJfc2QiOlsiMG1jQmxPd29peFVnWmFCUmVUMWdQNy1kYlp6alkzSllSTVozdVBSNlhBNCIsIjN6WWYtUzVWZEtBWFd2RmNaVE1pTjBwcVZja1BNMnlzV2VZQWM2TGlyb2MiLCJONnlCMDVLaUl1WjdZSUpabWM3Zm5BUWZBZGlHRlJ3eDZpbXExa0dvZVZNIiwiUld6RkZjZEE5TXQydE1ORW1xN3BsbVJMSW5aTEVYemtRUGVDeHFBSThXVSIsIlQ3SkI4T2dlR2lwVVRlMjZILUFjZldaZDVEdkt5RFRFN21MUkRSSy1DV0EiLCJYYVRwWEFjTVJnNEhhd1FSMk9rOTlsZ0JpRHBqSExJR0dwamF6VmtxdTNBIiwiZHB5cWJlVGV0UUNKUWdTRjdOTkJuMktScHlVUkkyV2xMQnVkSFI2YkZvRSIsImdxaldmM2cyaWZ1clpvNEVOT1l0RmdVYVdaT2ZvVFRMVGFobGZjb19YRW8iLCJqQ3gzS19wZk15c3FGNGktcVNKREtjVHhXUUdLbURoMnRsZmRmdlJqN2M4IiwicHN6M0xieDRkVkZaS1R4WXdBcUxrUG5GYkk1X0d1aWtSeHdoVndHa2U4WSIsInJ1RTNfWnBwd3lvek5GMWxveUQ1MHR4M3NvdkY1enN4cUl5VmFXeVh0MUEiLCJ4VDJtNjNLODFhU2NkSUhCelhteVE3Yjd3YW9iT0tsVi1jbTFveXJwbFBVIl0sIl9zZF9hbGciOiJzaGEtMjU2In0._fwXo8Ha3tZKUjkmRhRejNOfkkWzxBeHYR7-NAb5xlBiP1xt_fAI7lq_jbGY-YEtGOEe8YcsPfLKRPqzSzKmqA~WyI4NmU1NGNhMWE2ZTM5ZGI5IiwibG9jYWxpdHkiLCJLw5ZMTiJd~WyJhZjE5NmY2NDZjNjk3NzM4IiwicG9zdGFsX2NvZGUiLCI1MTE0NyJd~WyIzNWE0YzUwZTQ5YmU0MzFjIiwic3RyZWV0X2FkZHJlc3MiLCJIRUlERVNUUkHhup5FIDE3Il0~WyIxOWFjYjVjNjYyYjQ3ZDY0IiwiaXNzdWluZ19jb3VudHJ5IiwiREUiXQ~WyIxNzAxZjg3OTMwNmQwMzNjIiwiaXNzdWluZ19hdXRob3JpdHkiLCJERSJd~WyJiODVjM2RlYzM2MDI3NzM4IiwiZ2l2ZW5fbmFtZSIsIkVSSUtBIl0~WyJiYzc3ZGNlYmQxMjUyYzJkIiwiZmFtaWx5X25hbWUiLCJNVVNURVJNQU5OIl0~WyI1ZTUzNjM2ZDgwOTVkZjhjIiwiYmlydGhfZmFtaWx5X25hbWUiLCJHQUJMRVIiXQ~WyJiYmE5MTMyYWExZmIwYjdkIiwiYmlydGhkYXRlIiwiMTk2NC0wOC0xMiJd~WyJhYmVmZDVmMWVjMWIzZTQ3IiwiYWdlX2JpcnRoX3llYXIiLDE5NjRd~WyJlNmI1MDE5MTBiY2RlN2ZjIiwiYWdlX2luX3llYXJzIiw1OV0~WyJmOTFhZWU0OTE5NGUwYjE4IiwiYWdlX2VxdWFsX29yX292ZXIiLHsiMTIiOnRydWUsIjE0Ijp0cnVlLCIxNiI6dHJ1ZSwiMTgiOnRydWUsIjIxIjp0cnVlLCI2NSI6ZmFsc2V9XQ~WyI1MzJjZjUyNTZlODFlYzc4IiwicGxhY2Vfb2ZfYmlydGgiLHsibG9jYWxpdHkiOiJCRVJMSU4ifV0~WyI5OTVmMjc4MzcyMWZlNmQwIiwiYWRkcmVzcyIseyJfc2QiOlsiLUhQRzFSbElkVjZhdGpHRVVxRWlPY3phQjIwZEVsMm5CYktreDlqUmFCYyIsImFiQjFjaXpyUGVOSDRtZ1dBZHB0dEcwODVwckYyUlRONWEzRFJhZGszMDgiLCJ6dlhuc1pqY1FWRWs0a2RXOU04QmVNcW8zalkxYU44ZU4zNFoyU2tLelJFIl19XQ~WyIzZmIyZGRmNDE2ZWQwMGQzIiwibmF0aW9uYWxpdGllcyIsWyJERSJdXQ~',
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
