import { INestApplication } from "@nestjs/common";
import {
    Openid4vpAuthorizationRequest,
    Openid4vpClient,
} from "@openid4vc/openid4vp";
import { CryptoKey } from "jose";
import nock from "nock";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { StatusListService } from "../../src/issuer/lifecycle/status/status-list.service";
import { AuthConfig } from "../../src/shared/utils/webhook/webhook.dto";
import {
    PresentationRequest,
    ResponseType,
} from "../../src/verifier/oid4vp/dto/presentation-request.dto";
import {
    callbacks,
    encryptVpToken,
    PresentationTestContext,
    preparePresentation,
    setupPresentationTestApp,
} from "../utils";

describe("Presentation - Webhook Integration", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let host: string;
    let privateIssuerKey: CryptoKey;
    let issuerCert: string;
    let statusListService: StatusListService;
    let ctx: PresentationTestContext;

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
                    text: () => response.text,
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
     * Helper function to submit a complete presentation flow
     */
    async function submitPresentation(values: {
        requestId: string;
        credentialId: string;
        webhookUrl?: string;
        privateKey: CryptoKey;
        issuerCert: string;
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

        const x5c = [
            values.issuerCert
                .replace("-----BEGIN CERTIFICATE-----", "")
                .replace("-----END CERTIFICATE-----", "")
                .replaceAll(/\r?\n|\r/g, ""),
        ];
        const vp_token = await preparePresentation(
            {
                iat: Math.floor(Date.now() / 1000),
                aud: resolved.authorizationRequestPayload.aud as string,
                nonce: resolved.authorizationRequestPayload.nonce,
            },
            values.privateKey,
            x5c,
            statusListService,
            credentialConfigId,
        );

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

    beforeAll(async () => {
        ctx = await setupPresentationTestApp();
        app = ctx.app;
        authToken = ctx.authToken;
        host = ctx.host;
        privateIssuerKey = ctx.privateIssuerKey;
        issuerCert = ctx.issuerCert;
        statusListService = ctx.statusListService;
    });

    afterAll(async () => {
        await app.close();
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
            issuerCert,
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
            issuerCert,
            credentialId: "pid",
            webhookUrl: "http://localhost:8787/custom",
        });

        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
        expect(nock.isDone()).toBe(true);
    });
});
