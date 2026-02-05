import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import {
    type CredentialRequestErrorCode,
    CredentialRequestException,
} from "./credential-request.exception";

describe("CredentialRequestException", () => {
    it("should create exception with error code only", () => {
        const exception = new CredentialRequestException(
            "invalid_credential_request",
        );

        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
            error: "invalid_credential_request",
        });
    });

    it("should create exception with error code and description", () => {
        const exception = new CredentialRequestException(
            "invalid_proof",
            "The proofs parameter is missing",
        );

        expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
        expect(exception.getResponse()).toEqual({
            error: "invalid_proof",
            error_description: "The proofs parameter is missing",
        });
    });

    describe("error codes", () => {
        const errorCodes: CredentialRequestErrorCode[] = [
            "invalid_credential_request",
            "unknown_credential_configuration",
            "unknown_credential_identifier",
            "invalid_proof",
            "invalid_nonce",
            "invalid_encryption_parameters",
            "credential_request_denied",
        ];

        it.each(
            errorCodes,
        )("should accept %s as a valid error code", (errorCode) => {
            const exception = new CredentialRequestException(errorCode);
            expect((exception.getResponse() as { error: string }).error).toBe(
                errorCode,
            );
        });
    });

    it("should return HTTP 400 Bad Request status", () => {
        const exception = new CredentialRequestException(
            "credential_request_denied",
        );

        expect(exception.getStatus()).toBe(400);
    });
});
