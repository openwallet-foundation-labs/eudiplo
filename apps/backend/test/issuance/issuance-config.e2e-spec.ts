import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { App } from "supertest/types";
import { Agent, setGlobalDispatcher } from "undici";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { IssuanceDto } from "../../src/issuer/configuration/issuance/dto/issuance.dto";
import { IssuanceTestContext, setupIssuanceTestApp } from "../utils";

setGlobalDispatcher(
    new Agent({
        connect: {
            rejectUnauthorized: false,
        },
    }),
);

describe("Issuance - Configuration", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let ctx: IssuanceTestContext;

    beforeAll(async () => {
        ctx = await setupIssuanceTestApp();
        app = ctx.app;
        authToken = ctx.authToken;
    });

    afterAll(async () => {
        await app.close();
    });

    test("partial update should preserve existing config values", async () => {
        // Step 1: Get the current configuration
        const initialRes = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        const initialConfig = initialRes.body;
        expect(initialConfig.dPopRequired).toBeDefined();
        expect(initialConfig.display).toBeDefined();

        // Step 2: Update only one field (batchSize), leaving others undefined
        const partialUpdate: Partial<IssuanceDto> = {
            batchSize: 5,
        };

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(partialUpdate)
            .expect(201);

        // Step 3: Verify that other fields were preserved
        const updatedRes = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        const updatedConfig = updatedRes.body;

        // The updated field should have the new value
        expect(updatedConfig.batchSize).toBe(5);

        // Existing fields should be preserved (not overwritten with null/undefined)
        expect(updatedConfig.dPopRequired).toBe(initialConfig.dPopRequired);
        expect(updatedConfig.display).toEqual(initialConfig.display);
    });

    test("null values should explicitly clear existing config fields", async () => {
        // Step 1: Set up a configuration with chainedAs
        const setupConfig: Partial<IssuanceDto> = {
            batchSize: 10,
            chainedAs: {
                enabled: true,
                upstream: {
                    issuer: "https://auth.example.com/realms/test",
                    clientId: "test-client",
                    clientSecret: "test-secret",
                },
            },
        };

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(setupConfig)
            .expect(201);

        // Verify chainedAs is set
        const setupRes = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        expect(setupRes.body.chainedAs).toBeDefined();
        expect(setupRes.body.chainedAs.enabled).toBe(true);

        // Step 2: Send an update with chainedAs explicitly set to null
        const updateWithNull = {
            batchSize: 5,
            chainedAs: null,
        };

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(updateWithNull)
            .expect(201);

        // Step 3: Verify that chainedAs was cleared
        const finalRes = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        // batchSize should be updated
        expect(finalRes.body.batchSize).toBe(5);

        // chainedAs should be cleared (null)
        expect(finalRes.body.chainedAs).toBeNull();
    });

    test("chainedAs config should not be lost on partial update", async () => {
        // Step 1: Set up a configuration with chainedAs
        const configWithChainedAs: Partial<IssuanceDto> = {
            batchSize: 1,
            chainedAs: {
                enabled: true,
                upstream: {
                    issuer: "https://auth.example.com/realms/test",
                    clientId: "test-client",
                    clientSecret: "test-secret",
                },
            },
        };

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(configWithChainedAs)
            .expect(201);

        // Verify chainedAs is set
        const afterSetup = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        expect(afterSetup.body.chainedAs).toBeDefined();
        expect(afterSetup.body.chainedAs.enabled).toBe(true);

        // Step 2: Update a different field, not mentioning chainedAs at all
        const partialUpdate: Partial<IssuanceDto> = {
            batchSize: 2,
        };

        await request(app.getHttpServer())
            .post("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(partialUpdate)
            .expect(201);

        // Step 3: Verify chainedAs is still present
        const finalRes = await request(app.getHttpServer())
            .get("/issuer/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        expect(finalRes.body.batchSize).toBe(2);
        expect(finalRes.body.chainedAs).toBeDefined();
        expect(finalRes.body.chainedAs.enabled).toBe(true);
        expect(finalRes.body.chainedAs.upstream.issuer).toBe(
            "https://auth.example.com/realms/test",
        );
    });
});
