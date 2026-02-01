import { INestApplication } from "@nestjs/common";
import {
    Openid4vpAuthorizationRequest,
    Openid4vpClient,
} from "@openid4vc/openid4vp";
import { CryptoKey } from "jose";
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
    createPresentationRequest,
    createTestFetch,
    encryptVpToken,
    PresentationTestContext,
    preparePresentation,
    setupPresentationTestApp,
} from "../utils";

describe("Presentation - SD-JWT Credential", () => {
    let app: INestApplication<App>;
    let authToken: string;
    let host: string;
    let privateIssuerKey: CryptoKey;
    let issuerCert: string;
    let statusListService: StatusListService;
    let ctx: PresentationTestContext;

    const credentialConfigId = "pid";

    let client: Openid4vpClient;

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

        const res = await createPresentationRequest(
            app,
            authToken,
            requestBody,
        );

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

        client = new Openid4vpClient({
            callbacks: {
                ...callbacks,
                fetch: createTestFetch(app, () => host),
            },
        });
    });

    afterAll(async () => {
        await app.close();
    });

    test("present sd jwt credential", async () => {
        const { submitRes } = await submitPresentation({
            requestId: "pid-no-hook",
            credentialId: "pid",
            privateKey: privateIssuerKey,
            issuerCert,
        });

        expect(submitRes).toBeDefined();
        expect(submitRes.response.status).toBe(200);
    });

    test("present sd jwt credential with A256GCM encryption", async () => {
        const requestBody: PresentationRequest = {
            response_type: ResponseType.URI,
            requestId: "pid-no-hook",
        };

        const res = await createPresentationRequest(
            app,
            authToken,
            requestBody,
        );

        const authRequest = client.parseOpenid4vpAuthorizationRequest({
            authorizationRequest: res.body.uri,
        });

        const resolved = await client.resolveOpenId4vpAuthorizationRequest({
            authorizationRequestPayload: authRequest.params,
        });

        const x5c = [
            issuerCert
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
            privateIssuerKey,
            x5c,
            statusListService,
            credentialConfigId,
        );

        // Use A256GCM encryption instead of A128GCM
        const jwt = await encryptVpToken(vp_token, "pid", resolved, "A256GCM");

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
