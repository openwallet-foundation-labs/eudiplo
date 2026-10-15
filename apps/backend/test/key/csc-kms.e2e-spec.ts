import { createPrivateKey, type KeyObject } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import {
    createServer,
    type IncomingMessage,
    type Server,
    type ServerResponse,
} from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { INestApplication } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { p256, p384, p521 } from "@noble/curves/nist.js";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { SIGNING_ALG_SPECS } from "../../src/crypto/key/domain/signing-algs.js";
import { KeyChainType } from "../../src/crypto/key/dto/key-chain-create.dto.js";
import { createAppValidationPipe } from "../../src/shared/common/zod/zod-schema.util.js";
import { getToken } from "../utils.js";
import { createSelfSignedCa, expectCertificateSignedBy } from "../utils-ec.js";

const PROVIDER_ID = "csc-test";
const CSC_CREDENTIAL_ID = "[INTESIQCSEALEC]_SEAL_351_SIGN_1781018892758";
const CSC_USER_ID = "eudiplo_user";
const CSC_PIN = "1123581321";
const CSC_ACCESS_TOKEN = "mock-csc-access-token";
const CSC_SAD = "mock-csc-sad-token";

function readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
        req.on("error", reject);
    });
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
}

function base64UrlOrBase64ToBuffer(value: string): Buffer {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    return Buffer.from(padded, "base64");
}

type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
) => Promise<boolean>;

/** An authorize or signHash request the mock received. */
interface SignHashRequest {
    endpoint: "authorize" | "signHash";
    hashes: string[];
    hashAlgorithmOID?: string;
    signAlgo?: string;
}

/** Signs a hash as it is, without hashing it again (like a remote QSCD). */
function signDigest(privateKey: KeyObject, digest: Uint8Array): Uint8Array {
    const { crv, d } = privateKey.export({ format: "jwk" });
    const curve = { "P-256": p256, "P-384": p384, "P-521": p521 }[crv!]!;
    return curve.sign(digest, Buffer.from(d!, "base64url"), {
        prehash: false,
        format: "der",
    });
}

function buildCscRouteHandlers(input: {
    privateKey: KeyObject;
    certificatePem: string;
    signRequests: SignHashRequest[];
}): RouteHandler[] {
    const { privateKey, certificatePem, signRequests } = input;

    const tokenHandler: RouteHandler = async (req, res) => {
        if (req.method !== "POST" || req.url !== "/oauth2/token") {
            return false;
        }

        const body = new URLSearchParams(await readBody(req));
        if (
            body.get("grant_type") !== "client_credentials" ||
            body.get("client_id") !== "eudiplo-test" ||
            body.get("client_secret") !== "test-secret"
        ) {
            sendJson(res, 401, { error: "invalid_client" });
            return true;
        }

        sendJson(res, 200, {
            access_token: CSC_ACCESS_TOKEN,
            token_type: "Bearer",
            expires_in: 3600,
        });
        return true;
    };

    const listHandler: RouteHandler = async (req, res) => {
        if (req.method !== "POST" || req.url !== "/csc/v2/credentials/list") {
            return false;
        }

        const payload = JSON.parse(await readBody(req)) as { userID?: string };
        if (payload.userID !== CSC_USER_ID) {
            sendJson(res, 400, { error: "invalid_user" });
            return true;
        }

        sendJson(res, 200, { credentialIDs: [CSC_CREDENTIAL_ID] });
        return true;
    };

    const infoHandler: RouteHandler = async (req, res) => {
        if (req.method !== "POST" || req.url !== "/csc/v2/credentials/info") {
            return false;
        }

        const payload = JSON.parse(await readBody(req)) as {
            credentialID?: string;
        };
        if (payload.credentialID !== CSC_CREDENTIAL_ID) {
            sendJson(res, 404, { error: "credential_not_found" });
            return true;
        }

        const certB64 = certificatePem
            .replace("-----BEGIN CERTIFICATE-----", "")
            .replace("-----END CERTIFICATE-----", "")
            .replace(/\s+/g, "");
        sendJson(res, 200, {
            cert: {
                certificates: [certB64],
            },
        });
        return true;
    };

    const authorizeHandler: RouteHandler = async (req, res) => {
        if (
            req.method !== "POST" ||
            req.url !== "/csc/v2/credentials/authorize"
        ) {
            return false;
        }

        const payload = JSON.parse(await readBody(req)) as {
            credentialID?: string;
            authData?: Array<{ id?: string; value?: string }>;
            hashes?: string[];
            hashAlgorithmOID?: string;
        };
        signRequests.push({
            endpoint: "authorize",
            hashes: payload.hashes ?? [],
            hashAlgorithmOID: payload.hashAlgorithmOID,
        });
        const pin = payload.authData?.find((a) => a.id === "PIN")?.value;
        if (payload.credentialID !== CSC_CREDENTIAL_ID || pin !== CSC_PIN) {
            sendJson(res, 401, { error: "invalid_auth_data" });
            return true;
        }

        sendJson(res, 200, { SAD: CSC_SAD });
        return true;
    };

    const signHandler: RouteHandler = async (req, res) => {
        if (
            req.method !== "POST" ||
            req.url !== "/csc/v2/signatures/signHash"
        ) {
            return false;
        }

        const payload = JSON.parse(await readBody(req)) as {
            credentialID?: string;
            SAD?: string;
            hashes?: string[];
            hashAlgorithmOID?: string;
            signAlgo?: string;
        };
        if (
            payload.credentialID !== CSC_CREDENTIAL_ID ||
            payload.SAD !== CSC_SAD ||
            !payload.hashes?.[0]
        ) {
            sendJson(res, 400, { error: "invalid_sign_request" });
            return true;
        }

        signRequests.push({
            endpoint: "signHash",
            hashes: payload.hashes,
            hashAlgorithmOID: payload.hashAlgorithmOID,
            signAlgo: payload.signAlgo,
        });
        const digest = base64UrlOrBase64ToBuffer(payload.hashes[0]);
        const derSignature = signDigest(privateKey, digest);

        sendJson(res, 200, {
            signatures: [Buffer.from(derSignature).toString("base64")],
        });
        return true;
    };

    return [
        tokenHandler,
        listHandler,
        infoHandler,
        authorizeHandler,
        signHandler,
    ];
}

async function dispatchCscRequest(
    req: IncomingMessage,
    res: ServerResponse,
    handlers: RouteHandler[],
): Promise<void> {
    if (
        req.url !== "/oauth2/token" &&
        req.headers.authorization !== `Bearer ${CSC_ACCESS_TOKEN}`
    ) {
        sendJson(res, 401, { error: "unauthorized" });
        return;
    }

    for (const handler of handlers) {
        if (await handler(req, res)) {
            return;
        }
    }

    sendJson(res, 404, { error: "not_found" });
}

/**
 * Starts a mock CSC service holding one credential: the P-256 test key
 * (`test/key.pem`, `test/cert.pem`) unless another one is given.
 */
function startCscServer(
    credential: { privateKeyPem: string; certificatePem: string } = {
        privateKeyPem: readFileSync(join(__dirname, "../key.pem"), "utf8"),
        certificatePem: readFileSync(join(__dirname, "../cert.pem"), "utf8"),
    },
): Promise<{
    server: Server;
    baseUrl: string;
    signRequests: SignHashRequest[];
}> {
    const privateKey = createPrivateKey(credential.privateKeyPem);
    const signRequests: SignHashRequest[] = [];
    const handlers = buildCscRouteHandlers({
        privateKey,
        certificatePem: credential.certificatePem,
        signRequests,
    });

    const server = createServer(async (req, res) => {
        try {
            await dispatchCscRequest(req, res, handlers);
        } catch (err) {
            sendJson(res, 500, { error: String(err) });
        }
    });

    return new Promise((resolve) => {
        server.listen(0, "127.0.0.1", () => {
            const { port } = server.address() as AddressInfo;
            resolve({
                server,
                baseUrl: `http://127.0.0.1:${port}`,
                signRequests,
            });
        });
    });
}

/** kms.json entry of a CSC provider backed by a mock server. */
function cscProvider(id: string, baseUrl: string, extra: object = {}) {
    return {
        id,
        type: "csc",
        baseUrl,
        tokenUrl: `${baseUrl}/oauth2/token`,
        clientId: "eudiplo-test",
        clientSecret: "test-secret",
        scope: "service",
        userId: CSC_USER_ID,
        useAuthorizeEndpoint: true,
        authorizeAuthData: [
            {
                id: "PIN",
                value: CSC_PIN,
            },
        ],
        ...extra,
    };
}

/** A CSC provider whose credential holds a P-384 key. */
const P384_PROVIDER_ID = "csc-p384";
/** A CSC provider that allows ES384 while its credential holds a P-256 key. */
const MISMATCH_PROVIDER_ID = "csc-p256-as-es384";

describe("Key Chain - CSC KMS adapter (e2e)", () => {
    let cscServers: Server[];
    let p256SignRequests: SignHashRequest[];
    let p384SignRequests: SignHashRequest[];
    let app: INestApplication;
    let authToken: string;

    beforeAll(async () => {
        const p256Server = await startCscServer();
        const ca = await createSelfSignedCa("ES384", "CSC P-384 Seal");
        const p384Server = await startCscServer(ca);
        cscServers = [p256Server.server, p384Server.server];
        p256SignRequests = p256Server.signRequests;
        p384SignRequests = p384Server.signRequests;

        const tmpConfigDir = mkdtempSync(
            join(tmpdir(), "eudiplo-csc-kms-test-"),
        );
        writeFileSync(
            join(tmpConfigDir, "kms.json"),
            JSON.stringify({
                defaultProvider: PROVIDER_ID,
                providers: [
                    { id: "db", type: "db" },
                    cscProvider(PROVIDER_ID, p256Server.baseUrl),
                    cscProvider(P384_PROVIDER_ID, p384Server.baseUrl, {
                        algorithms: ["ES384"],
                    }),
                    cscProvider(MISMATCH_PROVIDER_ID, p256Server.baseUrl, {
                        algorithms: ["ES384"],
                    }),
                ],
            }),
        );

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    load: [() => ({ CONFIG_FOLDER: tmpConfigDir })],
                }),
                AppModule,
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(createAppValidationPipe());
        await app.init();

        const configService = app.get(ConfigService);
        const clientId = configService.getOrThrow<string>("AUTH_CLIENT_ID");
        const clientSecret =
            configService.getOrThrow<string>("AUTH_CLIENT_SECRET");
        authToken = await getToken(app, clientId, clientSecret);
    });

    afterAll(async () => {
        await app?.close();
        await Promise.all(
            (cscServers ?? []).map(
                (server) =>
                    new Promise<void>((resolve) =>
                        server.close(() => resolve()),
                    ),
            ),
        );
    });

    test("csc provider is listed with expected capabilities", async () => {
        const res = await request(app.getHttpServer())
            .get("/key-chain/providers")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        const provider = res.body.providers.find(
            (p: { name: string }) => p.name === PROVIDER_ID,
        );

        expect(provider).toBeDefined();
        expect(provider.type).toBe("csc");
        expect(provider.capabilities.canCreate).toBe(true);
        expect(provider.capabilities.canImport).toBe(false);
        expect(provider.capabilities.canDelete).toBe(false);
    });

    test("csc provider health check passes", async () => {
        const res = await request(app.getHttpServer())
            .get("/key-chain/providers/health")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        const providerHealth = res.body.find(
            (p: { providerId: string }) => p.providerId === PROVIDER_ID,
        );

        expect(providerHealth).toBeDefined();
        expect(providerHealth.ok).toBe(true);
    });

    test("create key chain with CSC provider", async () => {
        const createRes = await request(app.getHttpServer())
            .post("/key-chain")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                type: KeyChainType.Standalone,
                usageType: "access",
                kmsProvider: PROVIDER_ID,
                description: "csc kms e2e test",
            })
            .expect(201);

        const keyChainId: string = createRes.body.id;
        expect(keyChainId).toBeDefined();

        const keyRes = await request(app.getHttpServer())
            .get(`/key-chain/${keyChainId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        expect(keyRes.body.kmsProvider).toBe(PROVIDER_ID);
        expect(keyRes.body.activePublicKey.kty).toBe("EC");

        expect(keyRes.body.activeCertificate).toBeDefined();
        // The self-signed certificate was signed through signHash.
        expectCertificateSignedBy(keyRes.body.activeCertificate.pem, "ES256");
    });

    test("creates an ES384 key chain from a P-384 credential with SHA-384 OIDs", async () => {
        const providers = await request(app.getHttpServer())
            .get("/key-chain/providers")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(
            providers.body.providers.find(
                (p: { name: string }) => p.name === P384_PROVIDER_ID,
            ).capabilities,
        ).toMatchObject({ supportedAlgs: ["ES384"], defaultAlg: "ES384" });

        p384SignRequests.length = 0;
        const createRes = await request(app.getHttpServer())
            .post("/key-chain")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                type: KeyChainType.Standalone,
                usageType: "attestation",
                kmsProvider: P384_PROVIDER_ID,
            })
            .expect(201);

        const keyRes = await request(app.getHttpServer())
            .get(`/key-chain/${createRes.body.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(keyRes.body.alg).toBe("ES384");
        expect(keyRes.body.activePublicKey.crv).toBe("P-384");
        // The self-signed certificate was signed through signHash.
        expectCertificateSignedBy(keyRes.body.activeCertificate.pem, "ES384");

        const { hashOid, signatureOid } = SIGNING_ALG_SPECS.ES384;
        const endpoints = p384SignRequests.map((r) => r.endpoint);
        expect(endpoints).toContain("authorize");
        expect(endpoints).toContain("signHash");
        for (const signRequest of p384SignRequests) {
            expect(signRequest).toMatchObject(
                signRequest.endpoint === "signHash"
                    ? { hashAlgorithmOID: hashOid, signAlgo: signatureOid }
                    : { hashAlgorithmOID: hashOid },
            );
            expect(
                base64UrlOrBase64ToBuffer(signRequest.hashes[0]),
            ).toHaveLength(48);
        }
    });

    test("rejects a P-256 credential for ES384", async () => {
        p256SignRequests.length = 0;
        const res = await request(app.getHttpServer())
            .post("/key-chain")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                type: KeyChainType.Standalone,
                usageType: "attestation",
                kmsProvider: MISMATCH_PROVIDER_ID,
                alg: "ES384",
            });
        expect(res.status).toBe(500);

        const list = await request(app.getHttpServer())
            .get("/key-chain")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        expect(
            list.body.filter(
                (keyChain: { kmsProvider: string }) =>
                    keyChain.kmsProvider === MISMATCH_PROVIDER_ID,
            ),
        ).toEqual([]);
        // Refused when the credential's key is read, before anything is signed.
        expect(p256SignRequests).toEqual([]);
    });
});
