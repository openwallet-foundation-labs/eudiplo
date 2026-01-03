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
import { StatusListService } from "../src/issuer/lifecycle/status/status-list.service";
import { TrustListCreateDto } from "../src/issuer/trustlist/dto/trust-list-create.dto";
import { AuthConfig } from "../src/shared/utils/webhook/webhook.dto";
import {
    PresentationRequest,
    ResponseType,
} from "../src/verifier/oid4vp/dto/presentation-request.dto";
import { PresentationConfigCreateDto } from "../src/verifier/presentations/dto/presentation-config-create.dto";
import {
    callbacks,
    getToken,
    prepareMdocPresentation,
    preparePresentation,
} from "./utils";

describe("Presentation", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let host: string;
    let clientId: string;
    let clientSecret: string;
    let statusListService: StatusListService;

    let privateIssuerKey: CryptoKey;
    let x5c: string[];

    const credentialConfigId = "pid";

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
        credentialId: string,
        resolved: any,
    ): Promise<string> {
        const key = (await importJWK(
            resolved.authorizationRequestPayload.client_metadata?.jwks
                ?.keys[0] as JWK,
            "ECDH-ES",
        )) as CryptoKey;

        return new EncryptJWT({
            vp_token: { [credentialId]: [vp_token] },
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
        credentialId: string;
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

        const authRequest = client.parseOpenid4vpAuthorizationRequest({
            authorizationRequest: res.body.uri,
        });

        const resolved = await client.resolveOpenId4vpAuthorizationRequest({
            authorizationRequestPayload: authRequest.params,
        });

        let vp_token: string;
        if (values.credentialId === "pid-mso-mdoc") {
            vp_token = await prepareMdocPresentation(
                resolved.authorizationRequestPayload.nonce,
            );
        } else {
            vp_token = await preparePresentation(
                {
                    iat: Math.floor(Date.now() / 1000),
                    aud: resolved.authorizationRequestPayload.aud as string,
                    nonce: resolved.authorizationRequestPayload.nonce,
                },
                values.privateKey,
                values.x5c,
                statusListService,
                credentialConfigId,
            );
        }
        const jwt = await encryptVpToken(
            vp_token,
            values.credentialId || "pid",
            resolved,
        );

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

    /**
     * Helper to make requests and show detailed error on failure
     */
    async function expectRequest(
        req: request.Test,
        expectedStatus: number,
    ): Promise<request.Response> {
        const res = await req;
        if (res.status !== expectedStatus) {
            console.error(
                `Request failed: expected ${expectedStatus}, got ${res.status}`,
            );
            console.error("Response body:", JSON.stringify(res.body, null, 2));
        }
        expect(res.status).toBe(expectedStatus);
        return res;
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

        statusListService = app.get(StatusListService);

        await app.init();
        await app.listen(3000);
        authToken = await getToken(app, clientId, clientSecret);

        //import signing key and cert
        const privateKey = readFile<KeyImportDto>(
            join(configFolder, "root/keys/sign.json"),
        );

        privateIssuerKey = (await importJWK(
            privateKey.key,
            "ES256",
        )) as CryptoKey;

        await expectRequest(
            request(app.getHttpServer())
                .post("/key")
                .set("Authorization", `Bearer ${authToken}`)
                .send(privateKey),
            201,
        );

        const cert = readFile<CertImportDto>(
            join(
                configFolder,
                "root/certs/certificate-b6db7c84-776e-4998-9d40-ac599a4ea1fc-config.json",
            ),
        );
        x5c = [
            cert
                .crt!.replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll(/\r?\n|\r/g, ""),
        ];
        await expectRequest(
            request(app.getHttpServer())
                .post("/certs")
                .set("Authorization", `Bearer ${authToken}`)
                .send(cert),
            201,
        );

        //import the presentation configuration without webhook
        await expectRequest(
            request(app.getHttpServer())
                .post("/verifier/config")
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`)
                .send(
                    readFile<PresentationConfigCreateDto>(
                        join(
                            configFolder,
                            "root/presentation/pid-no-hook.json",
                        ),
                    ),
                ),
            201,
        );

        //import statuslist key and cert
        const statusListKey = readFile<KeyImportDto>(
            join(configFolder, "root/keys/status-list.json"),
        );

        await expectRequest(
            request(app.getHttpServer())
                .post("/key")
                .set("Authorization", `Bearer ${authToken}`)
                .send(statusListKey),
            201,
        );

        const statusListCert = readFile<CertImportDto>(
            join(
                configFolder,
                "root/certs/certificate-0f6e186f-9763-49ec-8d93-6cb801ded7a4-config.json",
            ),
        );

        await expectRequest(
            request(app.getHttpServer())
                .post("/certs")
                .set("Authorization", `Bearer ${authToken}`)
                .send(statusListCert),
            201,
        );

        //import the trust list and its key
        await expectRequest(
            request(app.getHttpServer())
                .post("/key")
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`)
                .send(
                    readFile<KeyImportDto>(
                        join(configFolder, "root/keys/trust-list.json"),
                    ),
                ),
            201,
        );

        //import cert
        await expectRequest(
            request(app.getHttpServer())
                .post("/certs")
                .set("Authorization", `Bearer ${authToken}`)
                .send(
                    readFile<CertImportDto>(
                        join(
                            configFolder,
                            "root/certs/certificate-fb139025-05f8-47af-be11-326c41098263-config.json",
                        ),
                    ),
                ),
            201,
        );

        await expectRequest(
            request(app.getHttpServer())
                .post("/trust-list")
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`)
                .send(
                    readFile<TrustListCreateDto>(
                        join(
                            configFolder,
                            "root/trustlists/trustlist-580831bc-ef11-43f4-a3be-a2b6bf1b29a3-config.json",
                        ),
                    ),
                ),
            201,
        );

        await expectRequest(
            request(app.getHttpServer())
                .post("/verifier/config")
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`)
                .send(
                    readFile<PresentationConfigCreateDto>(
                        join(configFolder, "root/presentation/pid-de.json"),
                    ),
                ),
            201,
        );

        await expectRequest(
            request(app.getHttpServer())
                .post("/verifier/config")
                .trustLocalhost()
                .set("Authorization", `Bearer ${authToken}`)
                .send(
                    readFile<PresentationConfigCreateDto>(
                        join(configFolder, "root/presentation/pid.json"),
                    ),
                ),
            201,
        );
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

    test("present sd jwt credential", async () => {
        const { submitRes } = await submitPresentation({
            requestId: "pid-no-hook",
            credentialId: "pid",
            privateKey: privateIssuerKey,
            x5c,
        });

        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
    });

    test("present mso mdoc credential", async () => {
        const { submitRes } = await submitPresentation({
            requestId: "pid-de",
            privateKey: privateIssuerKey,
            x5c,
            credentialId: "pid-mso-mdoc",
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
            credentialId: "pid",
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
            credentialId: "pid",
            webhookUrl: "http://localhost:8787/custom",
        });

        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
        expect(nock.isDone()).toBe(true);
    });
});
