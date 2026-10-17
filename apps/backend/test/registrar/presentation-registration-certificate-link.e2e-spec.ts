import { join, resolve } from "node:path";
import { INestApplication } from "@nestjs/common";
import { decodeJwt } from "jose";
import nock from "nock";
import request from "supertest";
import { App } from "supertest/types";
import {
    afterAll,
    afterEach,
    beforeAll,
    beforeEach,
    describe,
    expect,
    test,
    vi,
} from "vitest";
import { Role } from "../../src/auth/roles/role.enum.js";
import { KeyChainImportDto } from "../../src/crypto/key/dto/key-chain-import.dto.js";
import { KeyChainService } from "../../src/crypto/key/key-chain.service.js";
import { KeyUsageType } from "../../src/crypto/key/types/key-usage-type.js";
import { TrustListCreateDto } from "../../src/issuer/trust-list/dto/trust-list-create.dto.js";
import { issuerStateOf, readConfig, setupIssuanceTestApp } from "../utils.js";

const idp = "https://auth.registrar.example";
const realm = "/realms/registrar";
const registrar = "https://registrar.example";

/** Unsigned JWT; EUDIPLO only decodes registration certificates. */
function unsignedJwt(payload: Record<string, unknown>): string {
    const encode = (value: unknown) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
    return `${encode({ alg: "none", typ: "rc-rp+jwt" })}.${encode(payload)}.`;
}

/** OIDC discovery and the password grant of the registrar account. */
function oidcProvider() {
    nock(idp)
        .persist()
        .get(`${realm}/.well-known/openid-configuration`)
        .reply(200, {
            issuer: `${idp}${realm}`,
            token_endpoint: `${idp}${realm}/protocol/openid-connect/token`,
        })
        .post(`${realm}/protocol/openid-connect/token`)
        .reply(200, {
            access_token: "token",
            token_type: "Bearer",
            expires_in: 300,
        });
}

/**
 * A registration certificate links the access certificate that signs the
 * request object it is embedded in. In the Interactive Authorization Endpoint
 * the session keeps the access key chain of its client_id and the request
 * object is signed when the wallet fetches it, so the registration
 * certificate must link that key chain even when the tenant's default access
 * key chain changed in between.
 */
describe("Registration certificate linked to the request's access certificate (e2e)", () => {
    let app: INestApplication<App>;
    let authToken: string;
    const tenantId = "root";
    const configFolder = resolve(__dirname + "/../fixtures");
    /** The presentation configuration of the `citizen` IAE step. */
    const configId = "pid";
    /** Registrar access certificate id by key chain id. */
    const accessCertificateIds = new Map<string, string>();
    /** `accessCertificateId` of every registration certificate created. */
    const created: (string | undefined)[] = [];

    const api = () => request(app.getHttpServer());

    const createAccessKeyChain = async (
        type: "standalone" | "internalChain",
    ): Promise<string> =>
        (
            await api()
                .post("/key-chain")
                .set("Authorization", `Bearer ${authToken}`)
                .send({ usageType: "access", type })
                .expect(201)
        ).body.id;

    const defaultAccessKeyChain = async () =>
        (
            await app
                .get(KeyChainService)
                .findByUsageType(tenantId, KeyUsageType.Access)
        ).id;

    /**
     * Start an IAE presentation step. The session keeps the access key chain
     * of its client_id; the request object is signed when it is fetched.
     */
    const startSession = async (): Promise<string> => {
        const offer = await api()
            .post("/issuer/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                credentialConfigurationIds: ["citizen"],
                flow: "authorization_code",
            })
            .expect(201);
        const initial = await api()
            .post(`/issuers/${tenantId}/authorize/interactive`)
            .send({
                response_type: "code",
                client_id: "test-wallet",
                interaction_types_supported: "openid4vp_presentation",
                issuer_state: issuerStateOf(offer.body.uri),
                code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
                code_challenge_method: "S256",
            })
            .expect(200);
        const params = new URLSearchParams(
            initial.body.openid4vp_request.request,
        );
        return new URL(params.get("request_uri")!).pathname;
    };

    /** The access certificate the request object's registration certificate links. */
    const linkedAccessCertificate = async (requestPath: string) => {
        const res = await api().get(requestPath).trustLocalhost().expect(200);
        const verifierInfo = decodeJwt(res.text).verifier_info as {
            format: string;
            data: string;
        }[];
        expect(verifierInfo).toHaveLength(1);
        return decodeJwt(verifierInfo[0].data).access_certificate_id;
    };

    const cache = async () =>
        (
            await api()
                .get(`/verifier/config/${configId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200)
        ).body.registrationCertCache;

    beforeAll(async () => {
        const ctx = await setupIssuanceTestApp({
            extraRoles: [Role.Registrar],
        });
        app = ctx.app;
        authToken = ctx.authToken;

        await api()
            .post("/trust-list")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readConfig<TrustListCreateDto>(
                    join(configFolder, "haip/trust-lists/pid-tl.json"),
                ),
            )
            .expect(201);

        // Start with a single self-signed access key chain, so an internal
        // chain created later outranks it as the default.
        const fixtureAccess = readConfig<KeyChainImportDto>(
            join(configFolder, "haip/key-chains/access.json"),
        );
        await api()
            .delete(`/key-chain/${fixtureAccess.id}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(204);
        accessCertificateIds.set(
            await createAccessKeyChain("standalone"),
            "ac-1",
        );

        oidcProvider();
        await api()
            .post("/registrar/config")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                registrarUrl: registrar,
                oidcUrl: `${idp}${realm}`,
                clientId: "registrar-client",
                username: "registrar-user",
                password: "registrar-password",
            })
            .expect(201);
    });

    beforeEach(() => {
        oidcProvider();
        nock(registrar)
            .persist()
            .get("/relying-parties")
            .reply(200, [{ id: "rp-1" }])
            // Every access key chain of the test holds a registrar access
            // certificate.
            .get("/access-certificates")
            .query({ rp: "rp-1" })
            .reply(200, async () => {
                const keyChains = app.get(KeyChainService);
                return Promise.all(
                    [...accessCertificateIds].map(async ([keyChainId, id]) => ({
                        id,
                        relyingPartyId: "rp-1",
                        certificate: (
                            await keyChains.getEntity(tenantId, keyChainId)
                        ).activeCertificate,
                        revoked: null,
                    })),
                );
            })
            .post("/registration-certificates")
            .reply(201, async (req: Request) => {
                const { accessCertificateId, credentials } =
                    (await req.json()) as {
                        accessCertificateId?: string;
                        credentials: unknown[];
                    };
                created.push(accessCertificateId);
                const now = Math.floor(Date.now() / 1000);
                return {
                    jwt: unsignedJwt({
                        iat: now,
                        exp: now + 3600,
                        credentials,
                        access_certificate_id: accessCertificateId,
                        n: created.length,
                    }),
                };
            });
    });

    afterEach(() => {
        nock.cleanAll();
    });

    afterAll(async () => {
        await app?.close();
    });

    test("links the access key chain of each session and caches only the current default", async () => {
        const first = await defaultAccessKeyChain();
        expect(accessCertificateIds.get(first)).toBe("ac-1");

        await api()
            .patch(`/verifier/config/${configId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                registration_cert: {
                    body: {
                        privacy_policy: "https://rp.example/privacy",
                        support_uri: "https://rp.example/support",
                        purpose: [{ lang: "en", content: "Test" }],
                    },
                },
            })
            .expect(200);
        // Saving resolves the certificate in the background.
        await vi.waitFor(
            async () =>
                expect(await cache()).toMatchObject({
                    accessKeyChainId: first,
                }),
            { timeout: 10_000 },
        );
        expect(created).toEqual(["ac-1"]);

        const pinnedToFirst = [await startSession(), await startSession()];

        // An internal chain outranks the self-signed key chain.
        const second = await createAccessKeyChain("internalChain");
        accessCertificateIds.set(second, "ac-2");
        expect(await defaultAccessKeyChain()).toBe(second);

        // The cached certificate matches a session of the first key chain.
        expect(await linkedAccessCertificate(pinnedToFirst[0])).toBe("ac-1");
        expect(created).toEqual(["ac-1"]);

        // A session of the new default gets a new certificate, cached.
        expect(await linkedAccessCertificate(await startSession())).toBe(
            "ac-2",
        );
        expect(created).toEqual(["ac-1", "ac-2"]);
        expect(await cache()).toMatchObject({ accessKeyChainId: second });

        // An older session gets a certificate for its own key chain, and the
        // cache keeps the one of the default.
        expect(await linkedAccessCertificate(pinnedToFirst[1])).toBe("ac-1");
        expect(created).toEqual(["ac-1", "ac-2", "ac-1"]);
        expect(await cache()).toMatchObject({ accessKeyChainId: second });

        expect(await linkedAccessCertificate(await startSession())).toBe(
            "ac-2",
        );
        expect(created).toHaveLength(3);
    });
});
