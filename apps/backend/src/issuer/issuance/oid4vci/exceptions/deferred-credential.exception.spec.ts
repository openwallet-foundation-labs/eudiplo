import { HttpStatus } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { DeferredCredentialException } from "./deferred-credential.exception";

describe("DeferredCredentialException", () => {
    describe("issuance_pending", () => {
        it("should create exception with issuance_pending error", () => {
            const exception = new DeferredCredentialException(
                "issuance_pending",
            );

            expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            expect(exception.getResponse()).toEqual({
                error: "issuance_pending",
            });
        });

        it("should create exception with issuance_pending and error description", () => {
            const exception = new DeferredCredentialException(
                "issuance_pending",
                "The credential is still being processed",
            );

            expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            expect(exception.getResponse()).toEqual({
                error: "issuance_pending",
                error_description: "The credential is still being processed",
            });
        });

        it("should include interval for issuance_pending", () => {
            const exception = new DeferredCredentialException(
                "issuance_pending",
                "Please retry later",
                10,
            );

            expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            expect(exception.getResponse()).toEqual({
                error: "issuance_pending",
                error_description: "Please retry later",
                interval: 10,
            });
        });

        it("should include interval of 0 for issuance_pending", () => {
            const exception = new DeferredCredentialException(
                "issuance_pending",
                undefined,
                0,
            );

            expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            expect(exception.getResponse()).toEqual({
                error: "issuance_pending",
                interval: 0,
            });
        });
    });

    describe("invalid_transaction_id", () => {
        it("should create exception with invalid_transaction_id error", () => {
            const exception = new DeferredCredentialException(
                "invalid_transaction_id",
            );

            expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            expect(exception.getResponse()).toEqual({
                error: "invalid_transaction_id",
            });
        });

        it("should create exception with invalid_transaction_id and error description", () => {
            const exception = new DeferredCredentialException(
                "invalid_transaction_id",
                "The transaction has expired",
            );

            expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            expect(exception.getResponse()).toEqual({
                error: "invalid_transaction_id",
                error_description: "The transaction has expired",
            });
        });

        it("should NOT include interval for invalid_transaction_id", () => {
            const exception = new DeferredCredentialException(
                "invalid_transaction_id",
                "Transaction not found",
                10, // This should be ignored
            );

            expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            expect(exception.getResponse()).toEqual({
                error: "invalid_transaction_id",
                error_description: "Transaction not found",
            });
            // Verify interval is NOT included
            expect((exception.getResponse() as any).interval).toBeUndefined();
        });
    });

    describe("OID4VCI compliance", () => {
        it("should return HTTP 400 for all error codes", () => {
            const codes = [
                "issuance_pending",
                "invalid_transaction_id",
            ] as const;

            for (const code of codes) {
                const exception = new DeferredCredentialException(code);
                expect(exception.getStatus()).toBe(HttpStatus.BAD_REQUEST);
            }
        });

        it("should have correct response structure per OID4VCI spec", () => {
            const exception = new DeferredCredentialException(
                "issuance_pending",
                "Credential generation in progress",
                5,
            );

            const response = exception.getResponse() as Record<string, unknown>;

            // Required field
            expect(response).toHaveProperty("error", "issuance_pending");

            // Optional fields
            expect(response).toHaveProperty(
                "error_description",
                "Credential generation in progress",
            );
            expect(response).toHaveProperty("interval", 5);
        });
    });
});
