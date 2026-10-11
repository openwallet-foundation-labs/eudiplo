import { rmSync } from "node:fs";
import { INestApplication } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../../src/app.module.js";
import { createAppValidationPipe } from "../../src/shared/common/zod/zod-schema.util.js";
import { getToken } from "../utils.js";

describe("Status list configuration", () => {
    let app: INestApplication<App>;
    let authToken: string;

    const get = () =>
        request(app.getHttpServer())
            .get("/status-list-config")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
    const put = (body: Record<string, unknown>) =>
        request(app.getHttpServer())
            .put("/status-list-config")
            .set("Authorization", `Bearer ${authToken}`)
            .send(body)
            .expect(200);
    const reset = () =>
        request(app.getHttpServer())
            .delete("/status-list-config")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(204);

    beforeAll(async () => {
        rmSync("../../tmp/service.db", { force: true });
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();
        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(createAppValidationPipe());
        const configService = app.get(ConfigService);
        configService.set("CONFIG_IMPORT_MODE", "disabled");
        await app.init();
        authToken = await getToken(
            app,
            configService.getOrThrow<string>("AUTH_CLIENT_ID"),
            configService.getOrThrow<string>("AUTH_CLIENT_SECRET"),
            "status-list-config-e2e",
        );
    });

    afterAll(async () => {
        await app?.close();
    });

    test("replaces the stored settings on update", async () => {
        await put({ ttl: 900, immediateUpdate: true });
        await put({ capacity: 1000 });

        expect((await get()).body).toEqual({ capacity: 1000 });
    });

    test("removes the stored settings on reset", async () => {
        await put({ ttl: 900, bits: 2, enableAggregation: false });

        await reset();

        // The controller answers null, which Nest sends as an empty body.
        const response = await get();
        expect(response.text).toBe("");
    });
});
