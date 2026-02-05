import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { TokenErrorException } from "./token-error.exception";

describe("TokenErrorException", () => {
    it("should create exception with error code only", () => {
        const exception = new TokenErrorException("invalid_grant");
        const response = exception.getResponse() as {
            error: string;
            error_description?: string;
        };

        expect(response.error).toBe("invalid_grant");
        expect(response.error_description).toBeUndefined();
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    it("should create exception with error code and description", () => {
        const exception = new TokenErrorException(
            "invalid_grant",
            "The provided authorization code is invalid or expired",
        );
        const response = exception.getResponse() as {
            error: string;
            error_description?: string;
        };

        expect(response.error).toBe("invalid_grant");
        expect(response.error_description).toBe(
            "The provided authorization code is invalid or expired",
        );
        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
    });

    describe("error codes", () => {
        it("should support invalid_request error", () => {
            const exception = new TokenErrorException(
                "invalid_request",
                "Transaction code was provided but not expected",
            );
            const response = exception.getResponse() as { error: string };
            expect(response.error).toBe("invalid_request");
        });

        it("should support invalid_client error", () => {
            const exception = new TokenErrorException(
                "invalid_client",
                "Anonymous access is not supported",
            );
            const response = exception.getResponse() as { error: string };
            expect(response.error).toBe("invalid_client");
        });

        it("should support invalid_grant error", () => {
            const exception = new TokenErrorException(
                "invalid_grant",
                "Wrong transaction code provided",
            );
            const response = exception.getResponse() as { error: string };
            expect(response.error).toBe("invalid_grant");
        });

        it("should support unauthorized_client error", () => {
            const exception = new TokenErrorException(
                "unauthorized_client",
                "Client not authorized for this grant type",
            );
            const response = exception.getResponse() as { error: string };
            expect(response.error).toBe("unauthorized_client");
        });

        it("should support unsupported_grant_type error", () => {
            const exception = new TokenErrorException(
                "unsupported_grant_type",
                "Grant type not supported",
            );
            const response = exception.getResponse() as { error: string };
            expect(response.error).toBe("unsupported_grant_type");
        });

        it("should support invalid_scope error", () => {
            const exception = new TokenErrorException(
                "invalid_scope",
                "Requested scope is invalid",
            );
            const response = exception.getResponse() as { error: string };
            expect(response.error).toBe("invalid_scope");
        });
    });

    it("should always return HTTP 400 status", () => {
        const errorCodes = [
            "invalid_request",
            "invalid_client",
            "invalid_grant",
            "unauthorized_client",
            "unsupported_grant_type",
            "invalid_scope",
        ] as const;

        for (const code of errorCodes) {
            const exception = new TokenErrorException(code);
            expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        }
    });

    it("should produce OAuth 2.0 compliant response structure", () => {
        const exception = new TokenErrorException(
            "invalid_grant",
            "Test description",
        );
        const response = exception.getResponse();

        // OAuth 2.0 requires specific response format
        expect(typeof response).toBe("object");
        expect(response).toHaveProperty("error");
        expect(response).toHaveProperty("error_description");
    });
});
