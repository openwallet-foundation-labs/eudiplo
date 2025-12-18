import crypto from "node:crypto";
import {
    CoseKey,
    DeviceRequest,
    DocRequest,
    Holder,
    Issuer,
    IssuerSigned,
    ItemsRequest,
    SessionTranscript,
    SignatureAlgorithm,
} from "@animo-id/mdoc";
import { INestApplication } from "@nestjs/common";
import { CallbackContext, Jwk, SignJwtCallback } from "@openid4vc/oauth2";
import { X509Certificate } from "@peculiar/x509";
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
import { StatusListService } from "../src/issuer/lifecycle/status/status-list.service";
import {
    DEVICE_JWK,
    deterministicMdocContext,
    ISSUER_CERTIFICATE,
    ISSUER_PRIVATE_KEY_JWK,
    mdocContext,
} from "./utils-mdoc";

export async function prepareMdocPresentation(nonce: string) {
    //return "o2d2ZXJzaW9uYzEuMGlkb2N1bWVudHOBo2dkb2NUeXBld2V1LmV1cm9wYS5lYy5ldWRpLnBpZC4xbGlzc3VlclNpZ25lZKJqbmFtZVNwYWNlc6F3ZXUuZXVyb3BhLmVjLmV1ZGkucGlkLjGB2BhYW6RmcmFuZG9tUIpifa7gUvYBzQynBcTtJ9loZGlnZXN0SUQLbGVsZW1lbnRWYWx1ZW1IQU5TLUfDnE5USEVScWVsZW1lbnRJZGVudGlmaWVyamdpdmVuX25hbWVqaXNzdWVyQXV0aIRDoQEmoRghWQJeMIICWjCCAgGgAwIBAgIBATAKBggqhkjOPQQDAjBnMQswCQYDVQQGEwJERTEPMA0GA1UEBwwGQmVybGluMR0wGwYDVQQKDBRCdW5kZXNkcnVja2VyZWkgR21iSDERMA8GA1UECwwIVCBDUyBJREUxFTATBgNVBAMMDFBJRFAgRGVtbyBDQTAeFw0yNTExMTkxMjMzMjRaFw0yNjEyMjQxMjMzMjRaMEwxCzAJBgNVBAYTAkRFMR0wGwYDVQQKDBRCdW5kZXNkcnVja2VyZWkgR21iSDEKMAgGA1UECwwBSTESMBAGA1UEAwwJUElEUCBEZW1vMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBvWI7hJ4aN1oFXxRY_GFlGgkL3rW3frrv8qLH18v8d-KCHIrvMRoM8IaFY1OODCIYqXCo0BqY6FRXP3U5wsy_6OBuDCBtTAdBgNVHQ4EFgQUx0evI8GI6i4nynrJYtB75kuN4rYwDAYDVR0TAQH_BAIwADAOBgNVHQ8BAf8EBAMCB4AwVQYDVR0RBE4wTIIkZGVtby5waWQtcHJvdmlkZXIuYnVuZGVzZHJ1Y2tlcmVpLmRlhiRkZW1vLnBpZC1wcm92aWRlci5idW5kZXNkcnVja2VyZWkuZGUwHwYDVR0jBBgwFoAUgF_OyGFlHJhs9NWUXV_6gFhDvl8wCgYIKoZIzj0EAwIDRwAwRAIgCpFGgb_V1zWpwQeMKeoEkS3XSBkmeRvYswA7WaLtFrwCICNbfW95mkNfKJpyFWckk8SqyebKHN2kk_frIIzGDqS1WQTf2BhZBNqnZnN0YXR1c6Frc3RhdHVzX2xpc3SiY2lkeBgdY3VyaXhYaHR0cHM6Ly9kZW1vLnBpZC1wcm92aWRlci5idW5kZXNkcnVja2VyZWkuZGUvc3RhdHVzLzI4NDM4YzhkLTIzNDktNDQ2Yi1iMDc5LTk3YjhiOWZlMTU0OWdkb2NUeXBld2V1LmV1cm9wYS5lYy5ldWRpLnBpZC4xZ3ZlcnNpb25jMS4wbHZhbGlkaXR5SW5mb6Nmc2lnbmVkwHQyMDI1LTEyLTE3VDE2OjQxOjI4Wml2YWxpZEZyb23AdDIwMjUtMTItMTdUMTY6NDE6MjhaanZhbGlkVW50aWzAdDIwMjUtMTItMzFUMTY6NDE6MjhabHZhbHVlRGlnZXN0c6F3ZXUuZXVyb3BhLmVjLmV1ZGkucGlkLjG3AFggDeNAxZfZdUUTKqkdTSCYpYfIvxofqZz1gKqpM9sfbBsBWCDIQYY8aKssEQyTsVGW4nCgB4XIb9jXCWj8cJooxo7HkQJYIL6lXwhGUfK2fedk_ufNzdOugrGt2ItOO36mvfyUMQgeA1ggvsmNYD-G9Prn2D4MHwPoLqcUPdOCxBaIYdw-FVHy2gQEWCB6UW1L0CHIP1Ytd4h3BQ2cwT3lqi8hTa0dpieu6Pi7pgVYIPYv9KuWxf2VCrjSvAkq_mgtiJAilHbf54KOnuWvhxcfBlggXGE6rQ909paIz0xwJvbeQJZsJ9kC1C3zPvE5Y9YHPjMHWCBn-zIo1U3akHZ6aZ_5nOR0oh7JDpFOAHILjbC53zO0fwhYIN_RrWGGEh74g2z3GlzjUtS0CBlKVYlY778zeFS-B7qGCVggNchK-7IkyVnmj-7AMFlY9ief3fQrslYWONInAdpogkEKWCBYqXXzht7p0-1YlEC3-KFVk5AdBcprlD0kCI1c8U56pAtYIIat9hfBb59uI79aZBnsNqGo62e41TEanSNvPPda9DzLDFgg9vFkl8Cz9yBaY9e73qShUZcY2vRkZKXl6q7hZKE1OdwNWCDA2tAEXRtNwpDjaCzK5TaEAq9-i7ulPKMHknWc5PdOsw5YILRrPuYKXhwdx4dQh5lsucQ7Y5hcLroo30PIdW3rqdCpD1gg1U_snfgYhe5si8SGY4RmNYF4h77oTAomZoctrZS_Q3IQWCCHFVJsGs2a00U-OR0eixg0iJ3WheR5YXinfm67LGgnthFYIJeyQb7RuD8Aipl7ki-goflUF7uYtnklJI6FNT70Rgh-Elggk8ASmOig704FSpN6mJBX-AEkblZt3zky-fOCF3YR-0sTWCAXiU9G3-YQgoYW5QkudjO7T8OcJL9qdorLZTnzA65slBRYIE9EQu1XhrJhCgtgMkA8zihJ8FIZ0uU4N9FyT19MfhiwFVgg68pRk98Azkd4_lxzJFQAQT2kIscpEcXzNkXSIq2TPZQWWCBtGmeHk1hGcGWiZDSUkGxxqJ8qC45EusrIkcbthyj_7W1kZXZpY2VLZXlJbmZvoWlkZXZpY2VLZXmkAQIgASFYIEeNlBoNxCkcYkKuo6f8iIy5zXRB32F1swE49PmCrVKKIlggHjO59RUHkjyilm10crPbnCB60_V0WcPTaNCT5DJ2CR5vZGlnZXN0QWxnb3JpdGhtZ1NIQS0yNTZYQCGX08NrgHdLpUwRRMjSixg7_Ig2HNdEvWBLd-jrQeUDnDrMojl2nDmFKgnUBA2SAz87Ph9WlHYmA1wQEfRTUQRsZGV2aWNlU2lnbmVkompuYW1lU3BhY2Vz2BhBoGpkZXZpY2VBdXRooW9kZXZpY2VTaWduYXR1cmWEQ6EBJqD2WEB9LtG8kOucnSxMq90-DZ5IkRCTUUPvC1YOjK22ZrluFfjdZcPev-7XvQdJkm0_Quw8KfZ1nJ09CqoBfGSUd6P9ZnN0YXR1cwA";
    const issuer = new Issuer("org.iso.18013.5.1", deterministicMdocContext);

    const signed = new Date();
    const validFrom = new Date(signed);
    const validUntil = new Date(signed);
    validUntil.setFullYear(signed.getFullYear() + 30);

    issuer.addIssuerNamespace("org.iso.18013.5.1.mDL", {
        first_name: "First",
        last_name: "Last",
    });

    const issuerSigned = await issuer.sign({
        signingKey: CoseKey.fromJwk(ISSUER_PRIVATE_KEY_JWK),
        certificate: new Uint8Array(
            new X509Certificate(ISSUER_CERTIFICATE).rawData,
        ),
        algorithm: SignatureAlgorithm.ES256,
        digestAlgorithm: "SHA-256",
        deviceKeyInfo: { deviceKey: CoseKey.fromJwk(DEVICE_JWK) },
        validityInfo: { signed, validFrom, validUntil },
    });

    const encodedIssuerSigned = issuerSigned.encodedForOid4Vci;

    // openid4vci protocol

    const credential = IssuerSigned.fromEncodedForOid4Vci(encodedIssuerSigned);

    const deviceRequest = new DeviceRequest({
        docRequests: [
            new DocRequest({
                itemsRequest: new ItemsRequest({
                    docType: "org.iso.18013.5.1",
                    namespaces: {
                        "org.iso.18013.5.1.mDL": {
                            first_name: true,
                            last_name: true,
                        },
                    },
                }),
            }),
        ],
    });

    const fakeSessionTranscript = await SessionTranscript.forOid4Vp(
        {
            clientId: "my-client-id",
            responseUri: "my-response-uri.com",
            nonce,
        },
        mdocContext,
    );

    const deviceResponse = await Holder.createDeviceResponseForDeviceRequest(
        {
            deviceRequest,
            issuerSigned: [credential],
            sessionTranscript: fakeSessionTranscript,
            signature: { signingKey: CoseKey.fromJwk(DEVICE_JWK) },
        },
        mdocContext,
    );
    return deviceResponse.encodedForOid4Vp;
}

async function createCredential(options: {
    claims: any;
    privateKey: CryptoKey;
    x5c: string[];
}) {
    //create keypair for holder
    const { privateKeyHolder, publicKeyHolder } =
        await ES256.generateKeyPair().then((keyPair) => ({
            privateKeyHolder: keyPair.privateKey,
            publicKeyHolder: keyPair.publicKey,
        }));

    const sdjwt = new SDJwtVcInstance({
        signer: async (data: string) => {
            const encoder = new TextEncoder();
            const signature = await globalThis.crypto.subtle.sign(
                { name: "ECDSA", hash: "SHA-256" },
                options.privateKey,
                encoder.encode(data),
            );

            return btoa(String.fromCodePoint(...new Uint8Array(signature)))
                .replaceAll("+", "-")
                .replaceAll("/", "_")
                .replace(/=+$/, ""); // Convert to base64url format
        },
        signAlg: "ES256",
        hasher: digest,
        loadTypeMetadataFormat: true,
        saltGenerator: (length: number) =>
            crypto.randomBytes(length).toString("base64url"),
    });

    return sdjwt
        .issue(
            {
                ...options.claims,
                cnf: { jwk: publicKeyHolder },
            },
            undefined,
            {
                header: {
                    x5c: options.x5c,
                },
            },
        )
        .then((credential) => ({
            credential,
            privateKey: privateKeyHolder,
        }));
}

export async function preparePresentation(
    kb: Omit<kbPayload, "sd_hash">,
    privateKey: CryptoKey,
    x5c: string[],
    statusListService: StatusListService,
    credentialConfigId: string,
) {
    const status = await statusListService
        .createEntry({ tenantId: "root", id: "1" } as any, credentialConfigId)
        .catch((err) => {
            console.log(err);
        });

    const credential = await createCredential({
        claims: {
            vct: "http://localhost:3000/root/credentials-metadata/vct/pid",
            status,
        },
        privateKey,
        x5c,
    });

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
