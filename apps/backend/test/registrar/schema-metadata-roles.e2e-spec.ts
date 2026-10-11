import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, test } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { Role } from "../../src/auth/roles/role.enum.js";
import { createAppValidationPipe } from "../../src/shared/common/zod/zod-schema.util.js";
import { clientToken, getToken } from "../utils.js";

/**
 * Publishing schema metadata uses the tenant's registrar credentials and can
 * write into a credential config, so it needs issuance:manage and
 * registrar:manage. The tokens come from the token endpoint.
 */
describe("Schema metadata publish roles (e2e)", () => {
    let app: INestApplication;
    let issuanceToken: string;
    let registrarToken: string;
    let bothToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(createAppValidationPipe());
        await app.init();

        const configService = app.get(ConfigService);
        const adminToken = await getToken(
            app,
            configService.getOrThrow<string>("AUTH_CLIENT_ID"),
            configService.getOrThrow<string>("AUTH_CLIENT_SECRET"),
            "schema-publish-roles",
        );
        issuanceToken = await clientToken(
            app,
            adminToken,
            "schema-publish-issuance",
            [Role.Issuances],
        );
        registrarToken = await clientToken(
            app,
            adminToken,
            "schema-publish-registrar",
            [Role.Registrar],
        );
        bothToken = await clientToken(app, adminToken, "schema-publish-both", [
            Role.Issuances,
            Role.Registrar,
        ]);
    });

    afterAll(async () => {
        await app?.close();
    });

    const publish = (path: string, token: string) =>
        request(app.getHttpServer())
            .post(`/schema-metadata/${path}`)
            .set("Authorization", `Bearer ${token}`)
            .send({});

    describe.each(["publish", "publish-version"])("POST %s", (path) => {
        test("rejects a token with only issuance:manage", async () => {
            await publish(path, issuanceToken).expect(403);
        });

        test("rejects a token with only registrar:manage", async () => {
            await publish(path, registrarToken).expect(403);
        });

        test("passes a token with both roles to body validation", async () => {
            // Guards run before validation: 400 for the empty body means the
            // role check passed.
            await publish(path, bothToken).expect(400);
        });
    });

    test("keeps registrar:manage alone for reading schema metadata", async () => {
        const list = (token: string) =>
            request(app.getHttpServer())
                .get("/schema-metadata")
                .set("Authorization", `Bearer ${token}`);

        // 404: the role check passed and the tenant has no registrar config.
        await list(registrarToken).expect(404);
        await list(issuanceToken).expect(403);
    });
});
