import { describe, expect, it, vi } from "vitest";
import { OAuthError } from "../authorization/domain/oauth-error.js";
import {
    tokenErrorResponse,
    toOAuthHttpError,
} from "./token-error.exception.js";

describe("tokenErrorResponse", () => {
    it("maps an OAuthError to a 400 OAuth error body", () => {
        const response = tokenErrorResponse(
            new OAuthError("invalid_grant", "PKCE verification failed"),
        );
        expect(response.getStatus()).toBe(400);
        expect(response.getResponse()).toEqual({
            error: "invalid_grant",
            error_description: "PKCE verification failed",
        });
    });

    it("answers failed client authentication with 401", () => {
        const response = tokenErrorResponse(
            new OAuthError("invalid_client", "Wallet attestation is required", {
                clientAuthenticationFailed: true,
            }),
        );
        expect(response.getStatus()).toBe(401);
        expect(response.getResponse()).toEqual({
            error: "invalid_client",
            error_description: "Wallet attestation is required",
        });
    });

    it("omits a missing description and sanitizes forbidden characters", () => {
        expect(
            tokenErrorResponse(new OAuthError("invalid_request")).getResponse(),
        ).toEqual({ error: "invalid_request" });
        expect(
            tokenErrorResponse(
                new OAuthError("invalid_dpop_proof", 'bad "proof"\n\tline'),
            ).getResponse(),
        ).toEqual({
            error: "invalid_dpop_proof",
            error_description: "bad proof line",
        });
    });
});

describe("toOAuthHttpError", () => {
    const logger = () => ({ warn: vi.fn(), error: vi.fn() });

    it("logs the logDetail of an OAuthError with its cause as an error", () => {
        const log = logger();
        const cause = new Error("kms down");

        const response = toOAuthHttpError(
            new OAuthError("invalid_request", "Request failed", {
                logDetail: "Signing failed",
                cause,
            }),
            log,
        );

        expect(log.error).toHaveBeenCalledWith("Signing failed", cause);
        expect(log.warn).not.toHaveBeenCalled();
        expect(response).toMatchObject({
            response: { error: "invalid_request" },
        });
    });

    it("returns other errors unchanged and logs nothing", () => {
        const log = logger();
        const error = new Error("database unavailable");

        expect(toOAuthHttpError(error, log)).toBe(error);
        expect(log.warn).not.toHaveBeenCalled();
        expect(log.error).not.toHaveBeenCalled();
    });
});
