import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, type TestingModule } from "@nestjs/testing";
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
} from "vitest";
import { AppModule } from "../../src/app.module.js";
import { Role } from "../../src/auth/roles/role.enum.js";
import { createAppValidationPipe } from "../../src/shared/common/zod/zod-schema.util.js";
import { getTenantAdminToken } from "../utils.js";

/**
 * The registrar configuration endpoints reject URLs that are malformed or
 * blocked by the outbound URL policy with a 400 that names the field, before
 * anything is stored or any credential is sent.
 */
describe("Registrar configuration URLs", () => {
    let app: INestApplication<App>;
    let configService: ConfigService;
    let token: string;
    let oidc: Server;
    let oidcUrl: string;
    let oidcRequests: string[];

    const send = (
        method: "get" | "post" | "patch" | "delete",
        body?: object,
    ) => {
        const call = request(app.getHttpServer())
            [method]("/registrar/config")
            .set("Authorization", `Bearer ${token}`);
        return body ? call.send(body) : call;
    };
    const config = () => ({
        registrarUrl: "https://registrar.example",
        oidcUrl,
        clientId: "eudiplo",
        username: "user",
        password: "password",
    });

    beforeAll(async () => {
        // A Keycloak-like OIDC provider for the credential check on save.
        oidc = createServer((req, res) => {
            oidcRequests.push(`${req.method} ${req.url}`);
            req.resume();
            req.on("end", () => {
                res.setHeader("content-type", "application/json");
                if (req.url === "/oidc/.well-known/openid-configuration") {
                    res.end(
                        JSON.stringify({
                            issuer: oidcUrl,
                            token_endpoint: `${oidcUrl}/protocol/openid-connect/token`,
                        }),
                    );
                    return;
                }
                if (req.url === "/oidc/protocol/openid-connect/token") {
                    res.end(
                        JSON.stringify({
                            access_token: "token",
                            token_type: "Bearer",
                            expires_in: 300,
                        }),
                    );
                    return;
                }
                res.writeHead(404);
                res.end();
            });
        });
        await new Promise<void>((resolve) =>
            oidc.listen(0, "127.0.0.1", resolve),
        );
        oidcUrl = `http://127.0.0.1:${(oidc.address() as AddressInfo).port}/oidc`;

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(createAppValidationPipe());
        configService = app.get(ConfigService);
        configService.set("CONFIG_IMPORT_MODE", "disabled");
        await app.init();

        token = await getTenantAdminToken(
            app,
            configService.getOrThrow<string>("AUTH_CLIENT_ID"),
            configService.getOrThrow<string>("AUTH_CLIENT_SECRET"),
            `registrar-urls-${Date.now()}`,
            [Role.Registrar],
        );
    });

    afterAll(async () => {
        await app?.close();
        await new Promise<void>((resolve) => oidc?.close(() => resolve()));
    });

    beforeEach(() => {
        oidcRequests = [];
    });

    afterEach(async () => {
        configService.set("OUTBOUND_URL_ALLOWED_HOSTS", "");
        // Every test starts without a stored configuration.
        await send("delete").expect(204);
    });

    test("rejects a URL with a fragment before anything is stored", async () => {
        const response = await send("post", {
            ...config(),
            registrarUrl: "https://registrar.example/#",
        }).expect(400);

        expect(response.body.errors).toEqual([
            expect.objectContaining({
                path: ["registrarUrl"],
                message:
                    "Must be an http(s) URL without query, fragment or credentials",
            }),
        ]);
        expect(oidcRequests).toEqual([]);
        await send("get").expect(404);
    });

    test("rejects a URL the policy blocks and names the field", async () => {
        configService.set("OUTBOUND_URL_ALLOWED_HOSTS", "registrar.example");

        const response = await send("post", config()).expect(400);

        expect(response.body).toMatchObject({
            message:
                "Rejected by the outbound URL policy of this instance: oidcUrl: Outbound URL host is not in the allowlist",
            errors: [
                {
                    path: ["oidcUrl"],
                    message: "Outbound URL host is not in the allowlist",
                    code: "outbound_url_policy",
                },
            ],
        });
        // No credentials were sent anywhere.
        expect(oidcRequests).toEqual([]);
        await send("get").expect(404);
    });

    test("checks a registrar URL changed on its own", async () => {
        await send("post", config()).expect(201);
        expect(oidcRequests).toContain(
            "POST /oidc/protocol/openid-connect/token",
        );
        configService.set("OUTBOUND_URL_ALLOWED_HOSTS", "registrar.example");

        const response = await send("patch", {
            registrarUrl: "https://elsewhere.example",
        }).expect(400);

        expect(response.body.errors).toEqual([
            expect.objectContaining({ path: ["registrarUrl"] }),
        ]);
        const stored = await send("get").expect(200);
        expect(stored.body.registrarUrl).toBe("https://registrar.example");
    });
});
