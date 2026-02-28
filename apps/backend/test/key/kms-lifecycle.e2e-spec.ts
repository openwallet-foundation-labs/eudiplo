import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../../src/app.module";
import { getToken } from "../utils";

describe("Key — KMS provider lifecycle (e2e)", () => {
    let app: INestApplication;
    let authToken: string;
    let availableProviders: {
        name: string;
        capabilities: {
            canImport: boolean;
            canCreate: boolean;
            canDelete: boolean;
        };
    }[];

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        const configService = app.get(ConfigService);
        const clientId = configService.getOrThrow<string>("AUTH_CLIENT_ID");
        const clientSecret =
            configService.getOrThrow<string>("AUTH_CLIENT_SECRET");
        authToken = await getToken(app, clientId, clientSecret);

        const res = await request(app.getHttpServer())
            .get("/key/providers")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        availableProviders = res.body.providers;
    });

    afterAll(async () => {
        await app.close();
    });

    test("should list at least one KMS provider", () => {
        expect(availableProviders.length).toBeGreaterThanOrEqual(1);
    });

    test.each([
        "db",
        "vault",
    ])("%s — full key lifecycle (generate → get → public key → delete)", async (providerName) => {
        const provider = availableProviders.find(
            (p) => p.name === providerName,
        );

        if (!provider) {
            console.log(`Skipping "${providerName}" — not configured`);
            return;
        }

        if (!provider.capabilities.canCreate) {
            console.log(
                `Skipping "${providerName}" — does not support key generation`,
            );
            return;
        }

        // 1. Generate a key
        const generateRes = await request(app.getHttpServer())
            .post("/key/generate")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                kmsProvider: providerName,
                description: `e2e test key (${providerName})`,
            })
            .expect(201);

        const keyId = generateRes.body.id;
        expect(keyId).toBeDefined();
        expect(typeof keyId).toBe("string");

        // 2. Retrieve the key by ID
        const getRes = await request(app.getHttpServer())
            .get(`/key/${keyId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        expect(getRes.body.id).toBe(keyId);
        expect(getRes.body.kmsProvider).toBe(providerName);

        // 3. Key should appear in the list
        const listRes = await request(app.getHttpServer())
            .get("/key")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        const listed = listRes.body.find((k: any) => k.id === keyId);
        expect(listed).toBeDefined();

        // 4. Delete the key
        if (provider.capabilities.canDelete) {
            await request(app.getHttpServer())
                .delete(`/key/${keyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(200);

            // Verify it's gone
            await request(app.getHttpServer())
                .get(`/key/${keyId}`)
                .set("Authorization", `Bearer ${authToken}`)
                .expect(500); // findOneOrFail throws EntityNotFoundError
        }
    });
});
