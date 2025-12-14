import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { v4 } from "uuid";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../src/app.module";
import { KeyImportDto } from "../src/crypto/key/dto/key-import.dto";
import { getToken } from "./utils";

describe("Key (e2e)", () => {
    let app: INestApplication;
    let clientId: string;
    let clientSecret: string;
    let authToken: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());

        await app.init();
        const configService = app.get(ConfigService);
        clientId = configService.getOrThrow<string>("AUTH_CLIENT_ID");
        clientSecret = configService.getOrThrow<string>("AUTH_CLIENT_SECRET");

        authToken = await getToken(app, clientId, clientSecret);
    });

    afterAll(async () => {
        await app.close();
    });

    test("add a new key", async () => {
        const privateKey = {
            kty: "EC",
            x: "pmn8SKQKZ0t2zFlrUXzJaJwwQ0WnQxcSYoS_D6ZSGho",
            y: "rMd9JTAovcOI_OvOXWCWZ1yVZieVYK2UgvB2IPuSk2o",
            crv: "P-256",
            d: "rqv47L1jWkbFAGMCK8TORQ1FknBUYGY6OLU1dYHNDqU",
            kid: v4(),
            alg: "ES256",
        };

        const creationResponse = await request(app.getHttpServer())
            .post("/key")
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                id: privateKey.kid,
                key: privateKey,
            } as KeyImportDto)
            .expect(201);

        expect(creationResponse.body.id).toBe(privateKey.kid);

        const getResponse = await request(app.getHttpServer())
            .get("/key")
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200);
        const foundKey = getResponse.body.find(
            (key) => key.id === privateKey.kid,
        );
        expect(foundKey).toBeDefined();
    });
});
