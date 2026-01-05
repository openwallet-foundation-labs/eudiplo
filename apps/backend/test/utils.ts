import crypto from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
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
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { CallbackContext, Jwk, SignJwtCallback } from "@openid4vc/oauth2";
import { ResolvedOpenid4vpAuthorizationRequest } from "@openid4vc/openid4vp";
import { X509Certificate } from "@peculiar/x509";
import { digest, ES256 } from "@sd-jwt/crypto-nodejs";
import { SDJwtVcInstance } from "@sd-jwt/sd-jwt-vc";
import { kbPayload } from "@sd-jwt/types";
import {
    calculateJwkThumbprint,
    EncryptJWT,
    exportJWK,
    importJWK,
    importX509,
    JWK,
    jwtVerify,
    SignJWT,
} from "jose";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../src/app.module";
import { Role } from "../src/auth/roles/role.enum";
import { CertImportDto } from "../src/crypto/key/dto/cert-import.dto";
import { KeyImportDto } from "../src/crypto/key/dto/key-import.dto";
import { CertUsage } from "../src/crypto/key/entities/cert-usage.entity";
import { CredentialConfigCreate } from "../src/issuer/configuration/credentials/dto/credential-config-create.dto";
import { IssuanceDto } from "../src/issuer/configuration/issuance/dto/issuance.dto";
import { StatusListService } from "../src/issuer/lifecycle/status/status-list.service";
import { TrustListCreateDto } from "../src/issuer/trust-list/dto/trust-list-create.dto";
import { PresentationRequest } from "../src/verifier/oid4vp/dto/presentation-request.dto";
import { PresentationConfigCreateDto } from "../src/verifier/presentations/dto/presentation-config-create.dto";
import { DEVICE_JWK, mdocContext } from "./utils-mdoc";

export function readConfig<T>(path: string): T {
    return JSON.parse(readFileSync(path, "utf-8"));
}

export async function prepareMdocPresentation(
    nonce: string,
    privateKey: CryptoKey,
    issuerCert: string,
    clientId: string,
    responseUri: string,
) {
    const issuer = new Issuer("org.iso.18013.5.1", mdocContext);

    const signed = new Date();
    const validFrom = new Date(signed);
    const validUntil = new Date(signed);
    validUntil.setFullYear(signed.getFullYear() + 30);

    issuer.addIssuerNamespace("org.iso.18013.5.1.mDL", {
        first_name: "First",
        last_name: "Last",
    });

    //TODO: get key from eudiplo so it matches with the trust list
    const key = await exportJWK(privateKey);

    const issuerSigned = await issuer.sign({
        signingKey: CoseKey.fromJwk(key as Jwk),
        certificate: new Uint8Array(new X509Certificate(issuerCert).rawData),
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

    const sessionTranscript = await SessionTranscript.forOid4Vp(
        {
            clientId,
            responseUri,
            nonce,
        },
        mdocContext,
    );

    const deviceResponse = await Holder.createDeviceResponseForDeviceRequest(
        {
            deviceRequest,
            issuerSigned: [credential],
            sessionTranscript,
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
    const status = await statusListService.createEntry(
        { tenantId: "root", id: "1" } as any,
        credentialConfigId,
    );

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

/**
 * Shared test context returned by setupIssuanceTestApp
 */
export interface IssuanceTestContext {
    app: INestApplication<App>;
    authToken: string;
    clientId: string;
    clientSecret: string;
}

/**
 * Sets up a complete test application with all issuance configurations.
 * This is a shared setup for all issuance-related e2e tests.
 */
export async function setupIssuanceTestApp(): Promise<IssuanceTestContext> {
    // Delete the database
    rmSync("../../tmp/service.db", { force: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    const configService = app.get(ConfigService);
    configService.set("CONFIG_IMPORT", false);
    configService.set("CONFIG_IMPORT_FORCE", true);
    const clientId = configService.getOrThrow<string>("AUTH_CLIENT_ID");
    const clientSecret = configService.getOrThrow<string>("AUTH_CLIENT_SECRET");

    await app.init();
    await app.listen(3000);

    const authToken = await getToken(app, clientId, clientSecret);

    const privateKey: KeyImportDto = {
        id: "039af178-3ca0-48f4-a2e4-7b1209f30376",
        key: {
            kty: "EC",
            x: "pmn8SKQKZ0t2zFlrUXzJaJwwQ0WnQxcSYoS_D6ZSGho",
            y: "rMd9JTAovcOI_OvOXWCWZ1yVZieVYK2UgvB2IPuSk2o",
            crv: "P-256",
            d: "rqv47L1jWkbFAGMCK8TORQ1FknBUYGY6OLU1dYHNDqU",
            alg: "ES256",
        },
    };

    await request(app.getHttpServer())
        .post("/key")
        .set("Authorization", `Bearer ${authToken}`)
        .send(privateKey)
        .expect(201);

    // Create self signed certificate for the key
    await request(app.getHttpServer())
        .post("/certs")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
            keyId: privateKey.id,
            certUsageTypes: [CertUsage.Access, CertUsage.Signing],
        } as CertImportDto)
        .expect(201);

    const configFolder = resolve(__dirname + "/../../../assets/config");

    // Import image
    await request(app.getHttpServer())
        .post("/storage")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .attach("file", join(configFolder, "root/images/company.png"))
        .expect(201);

    // Import issuance config
    await request(app.getHttpServer())
        .post("/issuer/config")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send(
            readConfig<IssuanceDto>(
                join(configFolder, "root/issuance/issuance.json"),
            ),
        )
        .expect(201);

    // Import the pid credential configuration
    await request(app.getHttpServer())
        .post("/issuer/credentials")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send(
            readConfig<CredentialConfigCreate>(
                join(configFolder, "root/issuance/credentials/pid.json"),
            ),
        )
        .expect(201);

    // Import citizen presentation config (required for presentation during issuance)
    await request(app.getHttpServer())
        .post("/verifier/config")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send(
            readConfig<PresentationConfigCreateDto>(
                join(configFolder, "root/presentation/pid.json"),
            ),
        )
        .expect(201);

    // Import the citizen credential configuration
    await request(app.getHttpServer())
        .post("/issuer/credentials")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send(
            readConfig<CredentialConfigCreate>(
                join(configFolder, "root/issuance/credentials/citizen.json"),
            ),
        )
        .expect(201);

    // Import mDOC credential configuration
    await request(app.getHttpServer())
        .post("/issuer/credentials")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send(
            readConfig<CredentialConfigCreate>(
                join(configFolder, "root/issuance/credentials/pid-mdoc.json"),
            ),
        )
        .expect(201);

    return { app, authToken, clientId, clientSecret };
}

/**
 * Shared test context returned by setupPresentationTestApp
 */
export interface PresentationTestContext {
    app: INestApplication<App>;
    authToken: string;
    host: string;
    clientId: string;
    clientSecret: string;
    privateIssuerKey: CryptoKey;
    issuerCert: string;
    statusListService: StatusListService;
}

/**
 * Sets up a complete test application for presentation e2e tests.
 * This includes keys, certificates, presentation configs, and trust lists.
 */
export async function setupPresentationTestApp(): Promise<PresentationTestContext> {
    // Delete the database
    rmSync("../../tmp/service.db", { force: true });

    const moduleFixture: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
    }).compile();

    const app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());

    const configService = app.get(ConfigService);
    const configFolder = resolve(__dirname + "/../../../assets/config");
    configService.set("CONFIG_FOLDER", configFolder);
    const host = configService.getOrThrow("PUBLIC_URL");
    const clientId = configService.getOrThrow<string>("AUTH_CLIENT_ID");
    const clientSecret = configService.getOrThrow<string>("AUTH_CLIENT_SECRET");

    const statusListService = app.get(StatusListService);

    await app.init();
    await app.listen(3000);

    const authToken = await getToken(app, clientId, clientSecret);

    // Helper to make requests and show detailed error on failure
    async function expectRequest(
        req: request.Test,
        expectedStatus: number,
    ): Promise<request.Response> {
        const res = await req;
        if (res.status !== expectedStatus) {
            console.error(
                `Request failed: expected ${expectedStatus}, got ${res.status}`,
            );
            console.error("Response body:", JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(expectedStatus);
        return res;
    }

    // Import signing key and cert
    const privateKey = readConfig<KeyImportDto>(
        join(configFolder, "root/keys/sign.json"),
    );

    const privateIssuerKey = (await importJWK(privateKey.key, "ES256", {
        extractable: true,
    })) as CryptoKey;

    await expectRequest(
        request(app.getHttpServer())
            .post("/key")
            .set("Authorization", `Bearer ${authToken}`)
            .send(privateKey),
        201,
    );

    const cert = readConfig<CertImportDto>(
        join(
            configFolder,
            "root/certs/certificate-b6db7c84-776e-4998-9d40-ac599a4ea1fc-config.json",
        ),
    );
    const issuerCert = cert.crt!;
    await expectRequest(
        request(app.getHttpServer())
            .post("/certs")
            .set("Authorization", `Bearer ${authToken}`)
            .send(cert),
        201,
    );

    // Import presentation configuration without webhook
    await expectRequest(
        request(app.getHttpServer())
            .post("/verifier/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readConfig<PresentationConfigCreateDto>(
                    join(configFolder, "root/presentation/pid-no-hook.json"),
                ),
            ),
        201,
    );

    // Import statuslist key and cert
    const statusListKey = readConfig<KeyImportDto>(
        join(configFolder, "root/keys/status-list.json"),
    );

    await expectRequest(
        request(app.getHttpServer())
            .post("/key")
            .set("Authorization", `Bearer ${authToken}`)
            .send(statusListKey),
        201,
    );

    const statusListCert = readConfig<CertImportDto>(
        join(
            configFolder,
            "root/certs/certificate-0f6e186f-9763-49ec-8d93-6cb801ded7a4-config.json",
        ),
    );

    await expectRequest(
        request(app.getHttpServer())
            .post("/certs")
            .set("Authorization", `Bearer ${authToken}`)
            .send(statusListCert),
        201,
    );

    // Import trust list key
    await expectRequest(
        request(app.getHttpServer())
            .post("/key")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readConfig<KeyImportDto>(
                    join(configFolder, "root/keys/trust-list.json"),
                ),
            ),
        201,
    );

    // Import trust list cert
    await expectRequest(
        request(app.getHttpServer())
            .post("/certs")
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readConfig<CertImportDto>(
                    join(
                        configFolder,
                        "root/certs/certificate-fb139025-05f8-47af-be11-326c41098263-config.json",
                    ),
                ),
            ),
        201,
    );

    // Import trust list
    await expectRequest(
        request(app.getHttpServer())
            .post("/trust-list")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readConfig<TrustListCreateDto>(
                    join(
                        configFolder,
                        "root/trustlists/trustlist-580831bc-ef11-43f4-a3be-a2b6bf1b29a3-config.json",
                    ),
                ),
            ),
        201,
    );

    // Import presentation configs for pid-de and pid
    await expectRequest(
        request(app.getHttpServer())
            .post("/verifier/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readConfig<PresentationConfigCreateDto>(
                    join(configFolder, "root/presentation/pid-de.json"),
                ),
            ),
        201,
    );

    await expectRequest(
        request(app.getHttpServer())
            .post("/verifier/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readConfig<PresentationConfigCreateDto>(
                    join(configFolder, "root/presentation/pid.json"),
                ),
            ),
        201,
    );

    return {
        app,
        authToken,
        host,
        clientId,
        clientSecret,
        privateIssuerKey,
        issuerCert,
        statusListService,
    };
}

/**
 * Helper function to encrypt and prepare VP token
 */
export async function encryptVpToken(
    vp_token: string,
    credentialId: string,
    resolved: ResolvedOpenid4vpAuthorizationRequest,
): Promise<string> {
    const key = (await importJWK(
        resolved.authorizationRequestPayload.client_metadata?.jwks
            ?.keys[0] as JWK,
        "ECDH-ES",
    )) as CryptoKey;

    return new EncryptJWT({
        vp_token: { [credentialId]: [vp_token] },
        state: resolved.authorizationRequestPayload.state!,
    })
        .setProtectedHeader({
            alg: "ECDH-ES",
            enc: "A128GCM",
        })
        .setIssuedAt()
        .setExpirationTime("2h")
        .encrypt(key);
}

/**
 * Creates a test fetch function for Openid4vpClient that routes requests through supertest
 */
export function createTestFetch(
    app: INestApplication<App>,
    getHost: () => string,
) {
    return async (uri: string, init: RequestInit) => {
        const path = uri.split(getHost())[1];
        let response: request.Response;
        if (init.method === "POST") {
            response = await request(app.getHttpServer())
                .post(path)
                .trustLocalhost()
                .send(init.body!);
        } else {
            response = await request(app.getHttpServer())
                .get(path)
                .trustLocalhost();
        }
        return {
            ok: true,
            text: () => response.text,
            json: () => response.body,
            status: response.status,
            headers: response.headers,
        };
    };
}

/**
 * Helper function to create a presentation request via the verifier API
 */
export function createPresentationRequest(
    app: INestApplication<App>,
    authToken: string,
    requestBody: PresentationRequest,
) {
    return request(app.getHttpServer())
        .post("/verifier/offer")
        .trustLocalhost()
        .set("Authorization", `Bearer ${authToken}`)
        .send(requestBody);
}
