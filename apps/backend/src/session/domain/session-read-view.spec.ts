import { describe, expect, it } from "vitest";
import type { SessionData } from "./session-data.js";
import { readOnlySessionView } from "./session-read-view.js";

describe("readOnlySessionView", () => {
    const session = {
        id: "session-1",
        status: "active",
        reference: "order-4711",
        authorization_code: "code",
        refresh_token: "refresh",
        request_uri: "urn:par:1",
        auth_queries: { issuer_state: "state" },
        offer: { grants: { "pre-authorized_code": "secret" } },
        offerUrl: "openid-credential-offer://?credential_offer=…",
        credentialPayload: {
            flow: "pre_authorized_code",
            tx_code: "1234",
            credentialConfigurationIds: ["pid"],
            credentialClaims: {
                pid: { type: "inline", claims: { given_name: "Erika" } },
            },
        },
        requestUrl: "openid4vp://?request_uri=…",
        requestObject: "eyJ…",
        responseEncryptionPrivateJwk: { kty: "EC", d: "private" },
        vp_nonce: "nonce",
        walletNonce: "wallet-nonce",
        responseCode: "response-code",
        responseUri:
            "https://eudiplo.example/presentations/wallet-nonce/oid4vp",
        credentials: [{ given_name: "Erika" }],
    } as unknown as SessionData;

    it("drops the values that redeem or answer the session and keeps the rest", () => {
        const view = readOnlySessionView(session);

        for (const field of [
            "authorization_code",
            "refresh_token",
            "request_uri",
            "auth_queries",
            "offer",
            "offerUrl",
            "requestUrl",
            "requestObject",
            "responseEncryptionPrivateJwk",
            "vp_nonce",
            "walletNonce",
            "responseUri",
            "responseCode",
        ]) {
            expect(view).not.toHaveProperty(field);
        }
        expect(view.credentialPayload).toEqual({
            flow: "pre_authorized_code",
            credentialConfigurationIds: ["pid"],
            credentialClaims: {
                pid: { type: "inline", claims: { given_name: "Erika" } },
            },
        });
        expect(view).toMatchObject({
            id: "session-1",
            status: "active",
            reference: "order-4711",
            credentials: [{ given_name: "Erika" }],
        });
    });

    it("leaves the stored session unchanged", () => {
        readOnlySessionView(session);

        expect(session.offerUrl).toBeDefined();
        expect(session.credentialPayload?.tx_code).toBe("1234");
    });
});
