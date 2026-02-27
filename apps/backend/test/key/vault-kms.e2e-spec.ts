import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { GenericContainer, StartedTestContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../../src/app.module";
import { getToken } from "../utils";

const VAULT_DEV_ROOT_TOKEN = "test-root-token";

describe("Key — Vault KMS (e2e)", () => {
    let vaultContainer: StartedTestContainer;
    let app: INestApplication;
    let authToken: string;
    let tmpConfigDir: string;

    beforeAll(async () => {
        // 1. Start a Vault dev server in a container
        vaultContainer = await new GenericContainer("hashicorp/vault:1.19")
            .withExposedPorts(8200)
            .withEnvironment({ VAULT_DEV_ROOT_TOKEN_ID: VAULT_DEV_ROOT_TOKEN })
            .withWaitStrategy(
                Wait.forHttp("/v1/sys/health", 8200).forStatusCode(200),
            )
            .start();

        const vaultUrl = `http://${vaultContainer.getHost()}:${vaultContainer.getMappedPort(8200)}`;

        // 2. Create a temporary config folder with kms.json pointing to the container
        tmpConfigDir = mkdtempSync(join(tmpdir(), "eudiplo-vault-test-"));
        const tenantDir = join(tmpConfigDir, "test-tenant");
        if (!existsSync(tenantDir)) {
            mkdirSync(tenantDir, { recursive: true });
        }

        writeFileSync(
            join(tmpConfigDir, "kms.json"),
            JSON.stringify({
                defaultProvider: "vault",
                providers: {
                    db: {},
                    vault: {
                        vaultUrl,
                        vaultToken: VAULT_DEV_ROOT_TOKEN,
                    },
                },
            }),
        );

        // 3. Boot the NestJS app with CONFIG_FOLDER pointing to our temp dir
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
        app.useGlobalPipes(new ValidationPipe());
        await app.init();

        const configService = app.get(ConfigService);
        const clientId = configService.getOrThrow<string>("AUTH_CLIENT_ID");
        const clientSecret =
            configService.getOrThrow<string>("AUTH_CLIENT_SECRET");
        authToken = await getToken(app, clientId, clientSecret);
    }, 120_000); // container startup can be slow

    afterAll(async () => {
        await app?.close();
        await vaultContainer?.stop();
    });

    test("vault provider is available", async () => {
        const res = await request(app.getHttpServer())
            .get("/key/providers")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        const vault = res.body.providers.find((p: any) => p.name === "vault");
        expect(vault).toBeDefined();
        expect(vault.capabilities.canCreate).toBe(true);
    });

    test("generate → get → delete (vault)", async () => {
        // Generate
        const generateRes = await request(app.getHttpServer())
            .post("/key/generate")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                kmsProvider: "vault",
                description: "vault e2e test key",
            })
            .expect(201);

        const keyId = generateRes.body.id;
        expect(keyId).toBeDefined();

        // Get by ID
        const getRes = await request(app.getHttpServer())
            .get(`/key/${keyId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        expect(getRes.body.id).toBe(keyId);
        expect(getRes.body.kmsProvider).toBe("vault");

        // List — key should be present
        const listRes = await request(app.getHttpServer())
            .get("/key")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        expect(listRes.body.find((k: any) => k.id === keyId)).toBeDefined();

        // Delete
        await request(app.getHttpServer())
            .delete(`/key/${keyId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);

        // Confirm deleted
        await request(app.getHttpServer())
            .get(`/key/${keyId}`)
            .set("Authorization", `Bearer ${authToken}`)
            .expect(500);
    });

    test("vault mount is created automatically on first key", async () => {
        // Creating a key for a fresh tenant should auto-create the transit mount
        const res = await request(app.getHttpServer())
            .post("/key/generate")
            .set("Authorization", `Bearer ${authToken}`)
            .send({ kmsProvider: "vault" })
            .expect(201);

        expect(res.body.id).toBeDefined();
    });
});
