import type { SessionData } from "./session-data.js";

/**
 * Values with which a wallet redeems an offer or answers a request, and the
 * key that decrypts the answer. Whoever holds them can take over the flow.
 */
export const BEARER_FIELDS = [
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
] as const satisfies readonly (keyof SessionData)[];

/**
 * The session as a client sees it that may read but not change it, such as
 * one with only `sessions:read`: without the values of {@link BEARER_FIELDS}
 * and the transaction code of the offer.
 */
export function readOnlySessionView(session: SessionData): SessionData {
    const view: SessionData = { ...session };
    for (const field of BEARER_FIELDS) {
        delete view[field];
    }
    if (view.credentialPayload) {
        const { tx_code: _txCode, ...credentialPayload } =
            view.credentialPayload;
        view.credentialPayload = credentialPayload;
    }
    return view;
}
