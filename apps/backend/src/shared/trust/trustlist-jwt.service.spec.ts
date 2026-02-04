import { HttpService } from "@nestjs/axios";
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { of, throwError } from "rxjs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TrustListJwtService } from "./trustlist-jwt.service";

describe("TrustListJwtService", () => {
    let service: TrustListJwtService;
    let mockGet: ReturnType<typeof vi.fn>;
    let mockHttpService: { get: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockGet = vi.fn();
        mockHttpService = { get: mockGet };

        // Directly instantiate the service with the mock
        service = new TrustListJwtService(
            mockHttpService as unknown as HttpService,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("fetchJwt", () => {
        const testUrl = "https://example.com/trust-list";

        it("should return JWT on successful fetch", async () => {
            const mockJwt =
                "eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature";
            mockGet.mockReturnValue(of({ data: mockJwt } as any));

            const result = await service.fetchJwt(testUrl);

            expect(result).toBe(mockJwt);
            expect(mockGet).toHaveBeenCalledWith(testUrl, {
                signal: expect.any(AbortSignal),
                responseType: "text",
            });
        });

        it("should throw descriptive error on timeout (CanceledError)", async () => {
            const canceledError = new Error("canceled");
            canceledError.name = "CanceledError";
            (canceledError as any).code = "ERR_CANCELED";

            mockGet.mockReturnValue(throwError(() => canceledError));

            await expect(service.fetchJwt(testUrl)).rejects.toThrow(
                `Trust list fetch timed out after 4000ms for URL: ${testUrl}`,
            );
        });

        it("should throw descriptive error on timeout with ERR_CANCELED code only", async () => {
            const canceledError = new Error("Request aborted");
            (canceledError as any).code = "ERR_CANCELED";

            mockGet.mockReturnValue(throwError(() => canceledError));

            await expect(service.fetchJwt(testUrl)).rejects.toThrow(
                `Trust list fetch timed out after 4000ms for URL: ${testUrl}`,
            );
        });

        it("should throw descriptive error on network failure", async () => {
            const networkError = new Error("Network Error");
            mockGet.mockReturnValue(throwError(() => networkError));

            await expect(service.fetchJwt(testUrl)).rejects.toThrow(
                `Failed to fetch trust list from ${testUrl}: Network Error`,
            );
        });

        it("should throw descriptive error on HTTP 404", async () => {
            const httpError = new Error("Request failed with status code 404");
            mockGet.mockReturnValue(throwError(() => httpError));

            await expect(service.fetchJwt(testUrl)).rejects.toThrow(
                `Failed to fetch trust list from ${testUrl}: Request failed with status code 404`,
            );
        });

        it("should throw descriptive error on HTTP 500", async () => {
            const serverError = new Error(
                "Request failed with status code 500",
            );
            mockGet.mockReturnValue(throwError(() => serverError));

            await expect(service.fetchJwt(testUrl)).rejects.toThrow(
                `Failed to fetch trust list from ${testUrl}: Request failed with status code 500`,
            );
        });

        it("should include URL in error message for debugging", async () => {
            const uniqueUrl = "https://unique-trust-anchor.example.com/lote";
            const error = new Error("Connection refused");
            mockGet.mockReturnValue(throwError(() => error));

            await expect(service.fetchJwt(uniqueUrl)).rejects.toThrow(
                uniqueUrl,
            );
        });

        it("should use custom timeout when provided", async () => {
            const canceledError = new Error("canceled");
            canceledError.name = "CanceledError";

            mockGet.mockReturnValue(throwError(() => canceledError));

            await expect(service.fetchJwt(testUrl, 2000)).rejects.toThrow(
                `Trust list fetch timed out after 2000ms for URL: ${testUrl}`,
            );
        });

        it("should handle error without message property", async () => {
            const strangeError = { code: "UNKNOWN" };
            mockGet.mockReturnValue(throwError(() => strangeError));

            await expect(service.fetchJwt(testUrl)).rejects.toThrow(
                `Failed to fetch trust list from ${testUrl}:`,
            );
        });
    });

    describe("verifyTrustListJwt", () => {
        it("should skip verification when no verifier key is provided", async () => {
            const mockRef = { url: "https://example.com/trust-list" };
            const mockJwt = "eyJ...";

            await expect(
                service.verifyTrustListJwt(mockRef, mockJwt),
            ).resolves.toBeUndefined();
        });

        it("should verify valid JWT with correct key", async () => {
            const { privateKey, publicKey } = await generateKeyPair("ES256");
            const publicJwk = await exportJWK(publicKey);
            publicJwk.alg = "ES256";

            const jwt = await new SignJWT({ sub: "test", iss: "test-issuer" })
                .setProtectedHeader({ alg: "ES256" })
                .setIssuedAt()
                .setExpirationTime("1h")
                .sign(privateKey);

            const mockRef = {
                url: "https://example.com/trust-list",
                verifierKey: publicJwk,
            };

            await expect(
                service.verifyTrustListJwt(mockRef, jwt),
            ).resolves.toBeUndefined();
        });

        it("should throw error when JWT signature is invalid", async () => {
            const { publicKey } = await generateKeyPair("ES256");
            const { privateKey: differentKey } = await generateKeyPair("ES256");
            const publicJwk = await exportJWK(publicKey);
            publicJwk.alg = "ES256";

            // Sign with a different key
            const jwt = await new SignJWT({ sub: "test" })
                .setProtectedHeader({ alg: "ES256" })
                .setIssuedAt()
                .setExpirationTime("1h")
                .sign(differentKey);

            const mockRef = {
                url: "https://example.com/trust-list",
                verifierKey: publicJwk,
            };

            await expect(
                service.verifyTrustListJwt(mockRef, jwt),
            ).rejects.toThrow("Trust list JWT verification failed");
        });

        it("should throw error when JWT is expired", async () => {
            const { privateKey, publicKey } = await generateKeyPair("ES256");
            const publicJwk = await exportJWK(publicKey);
            publicJwk.alg = "ES256";

            // Create an expired JWT
            const jwt = await new SignJWT({ sub: "test" })
                .setProtectedHeader({ alg: "ES256" })
                .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
                .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
                .sign(privateKey);

            const mockRef = {
                url: "https://example.com/trust-list",
                verifierKey: publicJwk,
            };

            await expect(
                service.verifyTrustListJwt(mockRef, jwt),
            ).rejects.toThrow("Trust list JWT verification failed");
        });

        it("should include URL in error message for debugging", async () => {
            const { publicKey } = await generateKeyPair("ES256");
            const publicJwk = await exportJWK(publicKey);
            publicJwk.alg = "ES256";

            const uniqueUrl = "https://unique-trust-anchor.example.com/lote";
            const mockRef = {
                url: uniqueUrl,
                verifierKey: publicJwk,
            };

            await expect(
                service.verifyTrustListJwt(mockRef, "invalid.jwt.token"),
            ).rejects.toThrow(uniqueUrl);
        });

        it("should use default ES256 algorithm when not specified in key", async () => {
            const { privateKey, publicKey } = await generateKeyPair("ES256");
            const publicJwk = await exportJWK(publicKey);
            // Don't set alg - should default to ES256

            const jwt = await new SignJWT({ sub: "test" })
                .setProtectedHeader({ alg: "ES256" })
                .setIssuedAt()
                .setExpirationTime("1h")
                .sign(privateKey);

            const mockRef = {
                url: "https://example.com/trust-list",
                verifierKey: publicJwk,
            };

            await expect(
                service.verifyTrustListJwt(mockRef, jwt),
            ).resolves.toBeUndefined();
        });
    });
});
