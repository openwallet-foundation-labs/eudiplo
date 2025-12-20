import crypto from "node:crypto";
import { INestApplication } from "@nestjs/common";
import { CallbackContext, Jwk, SignJwtCallback } from "@openid4vc/oauth2";
import { digest, ES256 } from "@sd-jwt/crypto-nodejs";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { kbPayload } from "@sd-jwt/types";
import {
    calculateJwkThumbprint,
    exportJWK,
    importJWK,
    importX509,
    JWK,
    jwtVerify,
    SignJWT,
} from "jose";
import request from "supertest";
import { Role } from "../src/auth/roles/role.enum";

export async function preparePresentation(kb: Omit<kbPayload, "sd_hash">) {
    const credential = {
        privateKey: {
            kty: "EC",
            x: "G4EhWbF85dr81MKcKMm9s4aytmfRneCFL37Q1PjB734",
            y: "TK04sjmKHeLniUAEuezWieV254IVWwGryTfDGOT_L7I",
            crv: "P-256",
            d: "dD9hF_qxh4Gulcg4NXvr-_WpHBOrQVAEIaBKUvrcUfM",
        },
        credential:
            "eyJ0eXAiOiJkYytzZC1qd3QiLCJ4NWMiOlsiTUlJQllqQ0NBUWlnQXdJQkFnSUJBVEFLQmdncWhrak9QUVFEQWpBV01SUXdFZ1lEVlFRREV3dFNiMjkwSUZSbGJtRnVkREFlRncweU5URXlNVFF5TWpFek5ESmFGdzB5TmpFeU1UUXlNakV6TkRKYU1CWXhGREFTQmdOVkJBTVRDMUp2YjNRZ1ZHVnVZVzUwTUZrd0V3WUhLb1pJemowQ0FRWUlLb1pJemowREFRY0RRZ0FFcG1uOFNLUUtaMHQyekZsclVYekphSnd3UTBXblF4Y1NZb1MvRDZaU0docXN4MzBsTUNpOXc0ajg2ODVkWUpablhKVm1KNVZnclpTQzhIWWcrNUtUYXFOSE1FVXdGQVlEVlIwUkJBMHdDNElKYkc5allXeG9iM04wTUE0R0ExVWREd0VCL3dRRUF3SUZvREFkQmdOVkhRNEVGZ1FVZDhoenFhME5HV0hmUDlVZjNMY2REWjVlR0dFd0NnWUlLb1pJemowRUF3SURTQUF3UlFJaEFQT0pyQVVkZzFvNlJOcUhGQzNjekJVbElMU1haRjU0Z2JQMVJtTlRzc0xjQWlBKzZKYzh6bmdaLzJZa1QwbUZpQ3diTFhuUUtqZW9zVGUvaWZzNXBXRVBGdz09Il0sImFsZyI6IkVTMjU2In0.eyJpYXQiOjE3NjU3NTA0MjMsImV4cCI6MTc2NjM1NTIyMywidmN0IjoiaHR0cDovL2xvY2FsaG9zdDozMDAwL3Jvb3QvY3JlZGVudGlhbHMtbWV0YWRhdGEvdmN0L3BpZCIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsIngiOiJHNEVoV2JGODVkcjgxTUtjS01tOXM0YXl0bWZSbmVDRkwzN1ExUGpCNzM0IiwieSI6IlRLMDRzam1LSGVMbmlVQUV1ZXpXaWVWMjU0SVZXd0dyeVRmREdPVF9MN0kifX0sIl9zZCI6WyI4M0VSUHVEUWtKTmlpM2dNNll0a1lLMFhXdlNTU0p6N05UZ2JqcW92VWk4IiwiQTFfUHloVWNleGdZQkNYdDMtcVc1Y0pYbnFBMUFwZlN5ZjJQb084VVB0dyIsIkE2SHJlalRRbU5lZkRSSU1iZ0FNWnlCQ0hOdVY3N2YzLTB5Sk01dG5uZ1EiLCJGckdpVHVGQzI2a2RnYjZ4RWtsUlZZLXhfQlVkd3lTWFpUU1M4R1hWWTVvIiwiRnQ4amxXYlRLTHZJc1h1dmMycGhhVF9vWjRxckpWdWxWSEQ5dTFvTnNvayIsIkxJWWNiNDVBYzFoVy14cEJ2RVVnU1RzaXQtSFFFRnUtcDJEdk9KYVV4aU0iLCJNQy0xLUx6bnJIa0JhVzZRaktMSWNBN0VtYnBNUjc4WWJ4N05vWXBpZ3dFIiwiVVJxSGtYSXhBRHVNZGtHX1drbm9oSE1BaWQyWlJyaXAzeHFVN0NzcWNWUSIsImZfYUc3cUxQSHIwTjZnX3M0Rk5kYzVoZUJ1YUd2d2RCbW05dmpoVm10VjgiLCJoOGZCVFFkUWdLSm9YZUY5QldnbGdQMVIzNU1LLWI3aDc4ckEydEtzd2hZIiwidWVkV01uZjBnZ3dKYWdrR2JqVkFZYWg1RDZBdXZTX2s1TlhkeXJpN3BiWSIsInZaZC1SOUFGdG9veWdFSmltUmVzeEJIVEw2SGsyWnFrUjNvQTZJZ3VIWHciXSwiX3NkX2FsZyI6InNoYS0yNTYifQ.lb7QleBAHwUkpO5HkZtd4-rrD6xr4Ze1sN0sHuLeDgPpx4Nx8INnZ5c-iU5irFe-bIxi-LfRToSb28yXYFlbew~WyI2ODgzOWExYTYwOTM1YzZjIiwibG9jYWxpdHkiLCJLw5ZMTiJd~WyI3NGY5N2RkYTJhMzI1M2QwIiwicG9zdGFsX2NvZGUiLCI1MTE0NyJd~WyIxOTkyMDg0MmFhMTY5M2I4Iiwic3RyZWV0X2FkZHJlc3MiLCJIRUlERVNUUkHhup5FIDE3Il0~WyJiM2E0MzlhNTc4YzliN2UwIiwiaXNzdWluZ19jb3VudHJ5IiwiREUiXQ~WyIwYTg3M2U3MTYxODY0YjAyIiwiaXNzdWluZ19hdXRob3JpdHkiLCJERSJd~WyJlMmI1Yzc4MTlkYTMzMTA1IiwiZ2l2ZW5fbmFtZSIsIkVSSUtBIl0~WyI3NmUyMTg0OGMyN2NmOThkIiwiZmFtaWx5X25hbWUiLCJNVVNURVJNQU5OIl0~WyJlYWViOGIyOWRjZjUyN2YwIiwiYmlydGhfZmFtaWx5X25hbWUiLCJHQUJMRVIiXQ~WyI4MjE2YjMxZjJlZWRiNTNjIiwiYmlydGhkYXRlIiwiMTk2NC0wOC0xMiJd~WyI3NTMzYWE2MDMwYWZhOTQzIiwiYWdlX2JpcnRoX3llYXIiLDE5NjRd~WyJiODVlNmU5ZGJiYjk5YzU2IiwiYWdlX2luX3llYXJzIiw1OV0~WyIzZTFjYmEyNWI3YWE3MDdmIiwiYWdlX2VxdWFsX29yX292ZXIiLHsiMTIiOnRydWUsIjE0Ijp0cnVlLCIxNiI6dHJ1ZSwiMTgiOnRydWUsIjIxIjp0cnVlLCI2NSI6ZmFsc2V9XQ~WyJkODYxZjIzODY0OGVlYTFkIiwicGxhY2Vfb2ZfYmlydGgiLHsibG9jYWxpdHkiOiJCRVJMSU4ifV0~WyI0OTNjODA4MjE5MTBmY2FjIiwiYWRkcmVzcyIseyJfc2QiOlsiZ3k5dFg1cHBfdE5iMzM4OWdfN3phZEJLQkRKNnNkZS1kTmg4ZUdQMXBMVSIsImhXMENVVFFuNlhMaXc2R3FpQ2RaQThiUTRMeUthUExiYktMLUloTGhFYTQiLCJ2NVZUZndsMGZueUh6QWZ2M1BvT2JsUk9VREJVall2QVhBdER2cUpHZ0dzIl19XQ~WyI5ZWExM2E3MDBlMTlkOGUwIiwibmF0aW9uYWxpdGllcyIsWyJERSJdXQ~",
    };

    const sdjwt = new SDJwtVcInstance({
        hasher: digest,
        kbSigner: await ES256.getSigner(credential.privateKey),
        kbSignAlg: "ES256",
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
            .createHash(alg.replace("-", "").toLowerCase())
            .update(data)
            .digest(),
    generateRandom: (bytes) => crypto.randomBytes(bytes),
    /* clientAuthentication: clientAuthenticationNone({
        clientId: 'some-random-client-id',
    }), */
    verifyJwt: async (signer, { compact, payload }) => {
        let jwk: Jwk;
        let publicKey: CryptoKey;
        if (signer.method === "jwk") {
            jwk = signer.publicJwk;
            publicKey = (await importJWK(jwk as JWK, signer.alg)) as CryptoKey;
        } else if (signer.method === "x5c") {
            const headerB64 = compact.split(".")[0];
            const header = JSON.parse(
                Buffer.from(headerB64, "base64url").toString(),
            );
            const certPem = `-----BEGIN CERTIFICATE-----\n${header.x5c}\n-----END CERTIFICATE-----`;
            publicKey = await importX509(certPem, signer.alg);
            jwk = (await exportJWK(publicKey)) as Jwk;
        } else {
            throw new Error("Signer method not supported");
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
            .subjectAltName!.split(",")
            .map((name) => name.replace("DNS:", "").trim());
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
        if (signer.method === "jwk") {
            jwk = signer.publicJwk;
        } else {
            throw new Error("Signer method not supported");
        }

        const jwkThumprint = await calculateJwkThumbprint(jwk as JWK, "sha256");

        // add cnf
        payload.cnf = {
            jkt: jwkThumprint,
        };

        const privateJwk = await Promise.all(
            privateJwks.map(async (jwk) =>
                (await calculateJwkThumbprint(jwk as JWK, "sha256")) ===
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

/**
 * Creates a root tenant and returns the access token for a client.
 * @param app
 * @param clientId
 * @param clientSecret
 * @returns
 */
export async function getToken(
    app: INestApplication,
    clientId: string,
    clientSecret: string,
) {
    // Get JWT token using client credentials
    const tokenResponse = await request(app.getHttpServer())
        .post("/oauth2/token")
        .trustLocalhost()
        .send({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "client_credentials",
        })
        .expect(201);
    const authToken = tokenResponse.body.access_token;
    expect(authToken).toBeDefined();

    // create tenant
    await request(app.getHttpServer())
        .post("/tenant")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send({
            id: "root",
            name: "Root Tenant",
            roles: [
                Role.Clients,
                Role.IssuanceOffer,
                Role.Issuances,
                Role.PresentationOffer,
                Role.Presentations,
            ],
        })
        .expect(201);

    // get the admin of the tenant
    const client = await request(app.getHttpServer())
        .get("/tenant/root")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send()
        .then((res) =>
            res.body.clients.find((client) =>
                client.clientId.includes("admin"),
            ),
        );

    return request(app.getHttpServer())
        .post("/oauth2/token")
        .trustLocalhost()
        .send({
            client_id: client.clientId,
            client_secret: client.secret,
            grant_type: "client_credentials",
        })
        .expect(201)
        .then((res) => res.body.access_token);
}

export function getDefaultSecret(input: string): string {
    const pattern = /\$\{([A-Z0-9_]+)(?::([^}]*))?\}/g;
    return input.replace(
        pattern,
        (fullMatch, varName: string, defVal: string) => {
            return defVal;
        },
    );
}
