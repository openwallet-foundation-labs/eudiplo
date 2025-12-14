import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import {
    Openid4vpAuthorizationRequest,
    Openid4vpClient,
} from "@openid4vc/openid4vp";
import { readFileSync, rmSync } from "fs";
import { CryptoKey, EncryptJWT, importJWK, JWK } from "jose";
import { join, resolve } from "path";
import request from "supertest";
import { App } from "supertest/types";
import { beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../src/app.module";
import { KeyImportDto } from "../src/crypto/key/dto/key-import.dto";
import { callbacks, getToken, preparePresentation } from "./utils";

describe("Presentation", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let host: string;
    let clientId: string;
    let clientSecret: string;
    beforeAll(async () => {
        //delete the database
        rmSync("../../tmp/service.db", { force: true });
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        const configService = app.get(ConfigService);
        const configFolder = resolve(__dirname + "/../../../assets/config");
        configService.set("CONFIG_FOLDER", configFolder);
        host = configService.getOrThrow("PUBLIC_URL");
        clientId = configService.getOrThrow<string>("AUTH_CLIENT_ID");
        clientSecret = configService.getOrThrow<string>("AUTH_CLIENT_SECRET");
        app.useGlobalPipes(new ValidationPipe());

        await app.init();
        await app.listen(3000);
        authToken = await getToken(app, clientId, clientSecret);

        //import the pid credential configuration
        const pidCredentialConfiguration = JSON.parse(
            readFileSync(
                join(configFolder, "root/presentation/pid-no-hook.json"),
                "utf-8",
            ),
        );

        const privateKey: KeyImportDto = {
            id: "039af178-3ca0-48f4-a2e4-7b1209f30376",
            key: {
                kty: "EC",
                x: "pmn8SKQKZ0t2zFlrUXzJaJwwQ0WnQxcSYoS_D6ZSGho",
                y: "rMd9JTAovcOI_OvOXWCWZ1yVZieVYK2UgvB2IPuSk2o",
                crv: "P-256",
                d: "rqv47L1jWkbFAGMCK8TORQ1FknBUYGY6OLU1dYHNDqU",
                alg: "ES256",
            },
        };

        await request(app.getHttpServer())
            .post("/key")
            .set("Authorization", `Bearer ${authToken}`)
            .send(privateKey)
            .expect(201);

        // create self signed certificate for the key
        await request(app.getHttpServer())
            .post(`/certs/self-signed`)
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                keyId: privateKey.id,
                isSigningCert: true,
                isAccessCert: true,
            })
            .expect(201);

        await request(app.getHttpServer())
            .post("/presentation-management")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(pidCredentialConfiguration)
            .expect(201);
    });

    test("create oid4vp offer", async () => {
        const res = await request(app.getHttpServer())
            .post("/presentation-management/request")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                requestId: "pid-no-hook",
            });
        expect(res.status).toBe(201);
        expect(res.body).toBeDefined();
        const session = res.body.session;

        //check if the session exists
        await request(app.getHttpServer())
            .get(`/session/${session}`)
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBe(session);
            });
    });

    test("ask for an invalid oid4vp offer", async () => {
        await request(app.getHttpServer())
            .post("/presentation-management/request")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                requestId: "invalid",
            })
            .expect(409)
            .expect((res) => {
                expect(res.body.message).toContain(
                    "Request ID invalid not found",
                );
            });
    });

    test("present credential", async () => {
        const res = await request(app.getHttpServer())
            .post("/presentation-management/request")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: "uri",
                requestId: "pid-no-hook",
            });

        const client = new Openid4vpClient({
            callbacks: {
                ...callbacks,
                fetch: async (uri: string, init: RequestInit) => {
                    const path = uri.split(host)[1];
                    let response: any;
                    if (init.method === "POST") {
                        response = await request(app.getHttpServer())
                            .post(path)
                            .trustLocalhost()
                            .send(init.body!);
                    } else {
                        response = await request(app.getHttpServer())
                            .get(path)
                            .trustLocalhost();
                    }
                    return {
                        ok: true,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        text: () => response.text,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        json: () => response.body,
                        status: response.status,
                        headers: response.headers,
                    };
                },
            },
        });

        const authRequest = client.parseOpenid4vpAuthorizationRequest({
            authorizationRequest: res.body.uri,
        });

        const resolved = await client.resolveOpenId4vpAuthorizationRequest({
            authorizationRequestPayload: authRequest.params,
        });
        expect(resolved).toBeDefined();

        const vp_token = await preparePresentation({
            iat: Math.floor(Date.now() / 1000),
            aud: resolved.authorizationRequestPayload.aud as string,
            nonce: resolved.authorizationRequestPayload.nonce,
        });

        //encrypt the vp token
        const key = (await importJWK(
            resolved.authorizationRequestPayload.client_metadata?.jwks
                ?.keys[0] as JWK,
            "ECDH-ES",
        )) as CryptoKey;

        const jwt = await new EncryptJWT({
            vp_token: { pid: [vp_token] },
            state: resolved.authorizationRequestPayload.state!,
        })
            .setProtectedHeader({
                alg: "ECDH-ES",
                enc: "A128GCM",
            })
            .setIssuedAt()
            .setExpirationTime("2h") // Optional: set expiration
            .encrypt(key); // Use the public key for encryption

        const authorizationResponse =
            await client.createOpenid4vpAuthorizationResponse({
                authorizationRequestPayload: authRequest.params,
                authorizationResponsePayload: {
                    response: jwt,
                },
                ...callbacks,
            });

        const submitRes = await client.submitOpenid4vpAuthorizationResponse({
            authorizationResponsePayload:
                authorizationResponse.authorizationResponsePayload,
            authorizationRequestPayload:
                resolved.authorizationRequestPayload as Openid4vpAuthorizationRequest,
        });
        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
    });
});
