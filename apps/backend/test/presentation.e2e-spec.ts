import { readFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import {
    Openid4vpAuthorizationRequest,
    Openid4vpClient,
} from "@openid4vc/openid4vp";
import { CryptoKey, EncryptJWT, importJWK, JWK } from "jose";
import nock from "nock";
import request from "supertest";
import { App } from "supertest/types";
import { beforeAll, describe, expect, test } from "vitest";
import { AppModule } from "../src/app.module";
import { CertImportDto } from "../src/crypto/key/dto/cert-import.dto";
import { KeyImportDto } from "../src/crypto/key/dto/key-import.dto";
import { TrustListCreateDto } from "../src/issuer/trustlist/dto/trust-list-create.dto";
import { AuthConfig } from "../src/shared/utils/webhook/webhook.dto";
import {
    PresentationRequest,
    ResponseType,
} from "../src/verifier/oid4vp/dto/presentation-request.dto";
import { PresentationConfigCreateDto } from "../src/verifier/presentations/dto/presentation-config-create.dto";
import { callbacks, getToken, preparePresentation } from "./utils";

describe("Presentation", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let host: string;
    let clientId: string;
    let clientSecret: string;

    let privateIssuerKey: CryptoKey;
    let x5c: string[];

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

    /**
     * Helper function to create a presentation request
     */
    function createPresentationRequest(requestBody: PresentationRequest) {
        return request(app.getHttpServer())
            .post("/verifier/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(requestBody);
    }

    /**
     * Helper function to encrypt and prepare VP token
     */
    async function encryptVpToken(
        vp_token: string,
        resolved: any,
    ): Promise<string> {
        const key = (await importJWK(
            resolved.authorizationRequestPayload.client_metadata?.jwks
                ?.keys[0] as JWK,
            "ECDH-ES",
        )) as CryptoKey;

        return new EncryptJWT({
            vp_token: { pid: [vp_token] },
            state: resolved.authorizationRequestPayload.state!,
        })
            .setProtectedHeader({
                alg: "ECDH-ES",
                enc: "A128GCM",
            })
            .setIssuedAt()
            .setExpirationTime("2h")
            .encrypt(key);
    }

    /**
     * Helper function to submit a complete presentation flow
     */
    async function submitPresentation(values: {
        requestId: string;
        webhookUrl?: string;
        privateKey: CryptoKey;
        x5c: string[];
    }) {
        const requestBody: PresentationRequest = {
            response_type: ResponseType.URI,
            requestId: values.requestId,
            ...(values.webhookUrl && {
                webhook: {
                    url: values.webhookUrl,
                    auth: { type: AuthConfig.NONE },
                },
            }),
        };

        const res = await createPresentationRequest(requestBody);

        console.log(values.requestId);
        console.log(res.body);

        const authRequest = client.parseOpenid4vpAuthorizationRequest({
            authorizationRequest: res.body.uri,
        });

        const resolved = await client.resolveOpenId4vpAuthorizationRequest({
            authorizationRequestPayload: authRequest.params,
        });

        const vp_token = await preparePresentation(
            {
                iat: Math.floor(Date.now() / 1000),
                aud: resolved.authorizationRequestPayload.aud as string,
                nonce: resolved.authorizationRequestPayload.nonce,
            },
            values.privateKey,
            values.x5c,
        );

        const jwt = await encryptVpToken(vp_token, resolved);

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

        return { res, submitRes };
    }

    function readFile<T>(path: string): T {
        return JSON.parse(readFileSync(path, "utf-8"));
    }

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

        const privateKey = readFile<KeyImportDto>(
            join(configFolder, "root/keys/key.json"),
        );

        privateIssuerKey = (await importJWK(
            privateKey.key,
            "ES256",
        )) as CryptoKey;

        await request(app.getHttpServer())
            .post("/key")
            .set("Authorization", `Bearer ${authToken}`)
            .send(privateKey)
            .expect(201);

        // import cert

        const cert = readFile<CertImportDto>(
            join(configFolder, "root/certs/self-signed.json"),
        );
        x5c = [
            cert
                .crt!.replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll(/\r?\n|\r/g, ""),
        ];
        await request(app.getHttpServer())
            .post("/certs")
            .set("Authorization", `Bearer ${authToken}`)
            .send(cert)
            .expect(201);

        await request(app.getHttpServer())
            .post("/verifier/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readFile<PresentationConfigCreateDto>(
                    join(configFolder, "root/presentation/pid-no-hook.json"),
                ),
            )
            .expect(201);

        await request(app.getHttpServer())
            .post("/trust-list")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(
                readFile<TrustListCreateDto>(
                    join(configFolder, "root/trustlists/pid.json"),
                ),
            )
            .expect(201);

        //import the pid credential configuration
        const pidCredentialConfiguration = JSON.parse(
            readFileSync(
                join(configFolder, "root/presentation/pid.json"),
                "utf-8",
            ),
        );

        await request(app.getHttpServer())
            .post("/verifier/config")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send(pidCredentialConfiguration)
            .expect(201);
    });

    test("create oid4vp offer", async () => {
        const res = await createPresentationRequest({
            response_type: ResponseType.URI,
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
            .post("/verifier/offer")
            .trustLocalhost()
            .set("Authorization", `Bearer ${authToken}`)
            .send({
                response_type: ResponseType.URI,
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
        const { submitRes } = await submitPresentation({
            requestId: "pid-no-hook",
            privateKey: privateIssuerKey,
            x5c,
        });

        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
    });

    test("webhook in config", async () => {
        // Setup webhook mock with expectations
        nock("http://localhost:8787")
            .post("/consume", (body) => {
                expect(body).toBeDefined();
                expect(body.session).toBeDefined();
                expect(body.credentials).toBeDefined();
                expect(body.credentials[0].id).toBe("pid");
                expect(body.credentials[0].values).toBeDefined();
                return true;
            })
            .reply(200);

        const { submitRes } = await submitPresentation({
            requestId: "pid",
            privateKey: privateIssuerKey,
            x5c,
        });

        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
        expect(nock.isDone()).toBe(true);
    });

    test("passed webhook", async () => {
        // Setup webhook mock with expectations
        nock("http://localhost:8787")
            .post("/custom", (body) => {
                expect(body).toBeDefined();
                expect(body.session).toBeDefined();
                expect(body.credentials).toBeDefined();
                expect(body.credentials[0].id).toBe("pid");
                expect(body.credentials[0].values).toBeDefined();
                return true;
            })
            .reply(200);

        const { submitRes } = await submitPresentation({
            requestId: "pid",
            privateKey: privateIssuerKey,
            x5c,
            webhookUrl: "http://localhost:8787/custom",
        });

        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
        expect(nock.isDone()).toBe(true);
    });
});
