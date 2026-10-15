import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import nock from "nock";
import request from "supertest";
import { afterAll, afterEach, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { Role } from "../../src/auth/roles/role.enum.js";
import { createAppValidationPipe } from "../../src/shared/common/zod/zod-schema.util.js";
import { getTenantAdminToken } from "../utils.js";

const idp = "https://auth.registrar.example";
const realm = "/realms/registrar";
const attacker = "https://attacker.example";

const config = {
    registrarUrl: "https://registrar.example/api",
    oidcUrl: `${idp}${realm}`,
    clientId: "registrar-client",
    clientSecret: "stored-secret",
    username: "registrar-user",
    password: "stored-password",
};

/**
 * Answers OIDC discovery and the password grant of `origin` with
 * `accessToken`, and records the form body of every token request.
 */
function oidcProvider(
    origin: string,
    path: string,
    accessToken = "token",
): URLSearchParams[] {
    const tokenRequests: URLSearchParams[] = [];
    nock(origin)
        .persist()
        .get(`${path}/.well-known/openid-configuration`)
        .reply(200, {
            issuer: `${origin}${path}`,
            token_endpoint: `${origin}${path}/protocol/openid-connect/token`,
        })
        .post(`${path}/protocol/openid-connect/token`)
        .reply(async (req: Request) => {
            tokenRequests.push(new URLSearchParams(await req.text()));
            return [
                200,
                {
                    access_token: accessToken,
                    token_type: "Bearer",
                    expires_in: 300,
                },
            ];
        });
    return tokenRequests;
}

describe("Registrar configuration credentials (e2e)", () => {
    let app: INestApplication;
    let authToken: string;
    /** Token of a second tenant with its own registrar account. */
    let otherToken: string;

    const getConfig = () =>
        request(app.getHttpServer())
            .get("/registrar/config")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .then((res) => res.body);

    const patchConfig = (body: Record<string, unknown>) =>
        request(app.getHttpServer())
            .patch("/registrar/config")
            .set("Authorization", `Bearer ${authToken}`)
            .send(body);

    const postConfig = (body: Record<string, unknown>, token = authToken) =>
        request(app.getHttpServer())
            .post("/registrar/config")
            .set("Authorization", `Bearer ${token}`)
            .send(body)
            .expect(201);

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(createAppValidationPipe());
        await app.init();

        const configService = app.get(ConfigService);
        const clientId = configService.getOrThrow<string>("AUTH_CLIENT_ID");
        const clientSecret =
            configService.getOrThrow<string>("AUTH_CLIENT_SECRET");
        authToken = await getTenantAdminToken(
            app,
            clientId,
            clientSecret,
            "registrar-config-e2e",
            [Role.Registrar],
        );
        otherToken = await getTenantAdminToken(
            app,
            clientId,
            clientSecret,
            "registrar-config-e2e-other",
            [Role.Registrar],
        );
    });

    afterEach(() => {
        nock.cleanAll();
    });

    afterAll(async () => {
        await app?.close();
    });

    test("does not send the stored credentials to a new oidcUrl", async () => {
        oidcProvider(idp, realm);
        await postConfig(config);
        const attackerTokenRequests = oidcProvider(attacker, "/realms/x");

        const res = await patchConfig({ oidcUrl: `${attacker}/realms/x` });

        expect(res.status).toBe(400);
        expect(res.body.message).toContain("send password and clientSecret");
        expect(attackerTokenRequests).toHaveLength(0);
        expect((await getConfig()).oidcUrl).toBe(config.oidcUrl);
    });

    test("does not keep the stored credentials for a new registrarUrl", async () => {
        oidcProvider(idp, realm);
        await postConfig(config);

        const res = await patchConfig({ registrarUrl: `${attacker}/api` });

        expect(res.status).toBe(400);
        expect((await getConfig()).registrarUrl).toBe(config.registrarUrl);
    });

    test("sends only the new credentials to a new oidcUrl", async () => {
        const oldTokenRequests = oidcProvider(idp, realm);
        await postConfig(config);
        const before = oldTokenRequests.length;
        const newTokenRequests = oidcProvider(
            "https://auth.other.example",
            "/realms/x",
        );

        await patchConfig({
            oidcUrl: "https://auth.other.example/realms/x",
            password: "new-password",
            clientSecret: "new-secret",
        }).expect(200);

        expect(newTokenRequests).toHaveLength(1);
        expect(newTokenRequests[0].get("password")).toBe("new-password");
        expect(oldTokenRequests).toHaveLength(before);
    });

    test("checks the stored credentials at the unchanged oidcUrl", async () => {
        const tokenRequests = oidcProvider(idp, realm);
        await postConfig(config);

        await patchConfig({
            registrarUrl: config.registrarUrl,
            oidcUrl: config.oidcUrl,
            username: "other-user",
        }).expect(200);

        expect(tokenRequests.at(-1)?.get("username")).toBe("other-user");
        expect(tokenRequests.at(-1)?.get("password")).toBe(config.password);
    });

    test("removes the stored client secret when a replacement leaves it out", async () => {
        oidcProvider(idp, realm);
        await postConfig(config);
        expect((await getConfig()).hasClientSecret).toBe(true);

        const { clientSecret: _clientSecret, ...withoutSecret } = config;
        await postConfig(withoutSecret);

        expect((await getConfig()).hasClientSecret).toBe(false);
    });

    test("sends each tenant's registrar token only to its own registrar", async () => {
        const tenants = [
            {
                token: authToken,
                idp: "https://auth.a.example",
                registrar: "https://registrar.a.example",
                accessToken: "registrar-token-a",
            },
            {
                token: otherToken,
                idp: "https://auth.b.example",
                registrar: "https://registrar.b.example",
                accessToken: "registrar-token-b",
            },
        ];
        const scopes = tenants.map((tenant) => {
            oidcProvider(tenant.idp, realm, tenant.accessToken);
            return nock(tenant.registrar)
                .get("/api/relying-parties")
                .matchHeader("authorization", `Bearer ${tenant.accessToken}`)
                .reply(200, [{ id: `rp-${tenant.accessToken}` }])
                .get(`/api/schemas/relying-parties/rp-${tenant.accessToken}`)
                .reply(200, []);
        });
        for (const tenant of tenants) {
            await postConfig(
                {
                    ...config,
                    oidcUrl: `${tenant.idp}${realm}`,
                    registrarUrl: `${tenant.registrar}/api`,
                },
                tenant.token,
            );
        }

        await Promise.all(
            tenants.map((tenant) =>
                request(app.getHttpServer())
                    .get("/schema-metadata/mine")
                    .set("Authorization", `Bearer ${tenant.token}`)
                    .expect(200),
            ),
        );

        for (const scope of scopes) expect(scope.isDone()).toBe(true);
    });
});
