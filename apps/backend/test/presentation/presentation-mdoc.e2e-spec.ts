import { INestApplication } from "@nestjs/common";
import {
    Openid4vpAuthorizationRequest,
    Openid4vpClient,
} from "@openid4vc/openid4vp";
import { CryptoKey } from "jose";
import request from "supertest";
import { App } from "supertest/types";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { AuthConfig } from "../../src/shared/utils/webhook/webhook.dto";
import {
    PresentationRequest,
    ResponseType,
} from "../../src/verifier/oid4vp/dto/presentation-request.dto";
import {
    callbacks,
    encryptVpToken,
    PresentationTestContext,
    prepareMdocPresentation,
    setupPresentationTestApp,
} from "../utils";

describe("Presentation - mDOC Credential", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let host: string;
    let privateIssuerKey: CryptoKey;
    let issuerCert: string;
    let ctx: PresentationTestContext;

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
     * Helper function to submit a mDOC presentation
     */
    async function submitMdocPresentation(values: {
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

        const vp_token = await prepareMdocPresentation(
            resolved.authorizationRequestPayload.nonce,
            values.privateKey,
            values.issuerCert,
            resolved.authorizationRequestPayload.client_id,
            resolved.authorizationRequestPayload.response_uri,
        );

        const jwt = await encryptVpToken(
            vp_token,
            values.credentialId,
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
    });

    afterAll(async () => {
        await app.close();
    });

    test("present mso mdoc credential", async () => {
        const { submitRes } = await submitMdocPresentation({
            requestId: "pid-de",
            privateKey: privateIssuerKey,
            issuerCert,
            credentialId: "pid-mso-mdoc",
        });

        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
    });
});
