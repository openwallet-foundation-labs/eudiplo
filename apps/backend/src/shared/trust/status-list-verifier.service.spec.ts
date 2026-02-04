import { HttpService } from "@nestjs/axios";
import { of, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    StatusListVerifierService,
    StatusValue,
} from "./status-list-verifier.service";

describe("StatusListVerifierService", () => {
    let service: StatusListVerifierService;
    let mockGet: ReturnType<typeof vi.fn>;
    let mockHttpService: { get: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockGet = vi.fn();
        mockHttpService = { get: mockGet };

        // Directly instantiate the service with the mock
        service = new StatusListVerifierService(
            mockHttpService as unknown as HttpService,
        );
    });

    afterEach(() => {
        service.clearCache();
        vi.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("fetchStatusListJwt error handling", () => {
        const testUri = "https://example.com/status-list";

        it("should throw descriptive error on timeout (CanceledError)", async () => {
            const canceledError = new Error("canceled");
            canceledError.name = "CanceledError";
            (canceledError as any).code = "ERR_CANCELED";

            mockGet.mockReturnValue(throwError(() => canceledError));

            await expect(service.checkStatus(testUri, 0)).rejects.toThrow(
                `Status list fetch timed out after 10000ms for URI: ${testUri}`,
            );
        });

        it("should throw descriptive error on network failure", async () => {
            const networkError = new Error("Network Error");
            mockGet.mockReturnValue(throwError(() => networkError));

            await expect(service.checkStatus(testUri, 0)).rejects.toThrow(
                `Failed to fetch status list from ${testUri}: Network Error`,
            );
        });

        it("should throw descriptive error on HTTP error", async () => {
            const httpError = new Error("Request failed with status code 404");
            mockGet.mockReturnValue(throwError(() => httpError));

            await expect(service.checkStatus(testUri, 0)).rejects.toThrow(
                `Failed to fetch status list from ${testUri}: Request failed with status code 404`,
            );
        });

        it("should throw descriptive error on 500 server error", async () => {
            const serverError = new Error(
                "Request failed with status code 500",
            );
            mockGet.mockReturnValue(throwError(() => serverError));

            await expect(service.checkStatus(testUri, 0)).rejects.toThrow(
                `Failed to fetch status list from ${testUri}: Request failed with status code 500`,
            );
        });

        it("should include URI in error message for debugging", async () => {
            const uniqueUri =
                "https://unique-issuer.example.com/my-status-list";
            const error = new Error("Connection refused");
            mockGet.mockReturnValue(throwError(() => error));

            await expect(service.checkStatus(uniqueUri, 0)).rejects.toThrow(
                uniqueUri,
            );
        });
    });

    describe("getStatusDescription", () => {
        it("should return correct descriptions for known status values", () => {
            // Access private method via any cast for testing
            const getDesc = (status: number) =>
                (service as any).getStatusDescription(status);

            expect(getDesc(StatusValue.VALID)).toBe("Valid");
            expect(getDesc(StatusValue.INVALID)).toBe("Invalid/Revoked");
            expect(getDesc(StatusValue.SUSPENDED)).toBe("Suspended");
            expect(getDesc(99)).toBe("Unknown status (99)");
        });
    });

    describe("cache management", () => {
        it("should clear specific URI from cache", () => {
            const uri = "https://example.com/status";
            service.clearCache(uri);
            const stats = service.getCacheStats();
            expect(stats.uris).not.toContain(uri);
        });

        it("should clear all cache when no URI specified", () => {
            service.clearCache();
            const stats = service.getCacheStats();
            expect(stats.size).toBe(0);
            expect(stats.jwtCacheSize).toBe(0);
        });
    });
});
