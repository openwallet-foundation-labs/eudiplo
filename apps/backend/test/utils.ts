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
import { StatusListService } from "../src/issuer/lifecycle/status/status-list.service";

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
