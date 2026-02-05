import { HttpService } from "@nestjs/axios";
import * as x509 from "@peculiar/x509";
import { throwError } from "rxjs";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { CrlValidationService } from "./crl-validation.service";

describe("CrlValidationService", () => {
    let service: CrlValidationService;
    let httpService: HttpService;
    let testCert: x509.X509Certificate;
    let testCertPem: string;

    beforeAll(async () => {
        // Generate a test certificate (self-signed, no CRL distribution points)
        const alg = {
            name: "ECDSA",
            namedCurve: "P-256",
            hash: "SHA-256",
        };
        const keys = await crypto.subtle.generateKey(alg, true, [
            "sign",
            "verify",
        ]);

        testCert = await x509.X509CertificateGenerator.createSelfSigned({
            serialNumber: "01",
            name: "CN=Test Certificate",
            notBefore: new Date(),
            notAfter: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            signingAlgorithm: alg,
            keys: keys as CryptoKeyPair,
        });

        testCertPem = testCert.toString("pem");
    });

    beforeEach(() => {
        httpService = {
            get: vi.fn(),
        } as unknown as HttpService;

        service = new CrlValidationService(httpService);
    });

    describe("checkCertificateRevocation", () => {
        it("should return valid with info when certificate has no CRL Distribution Points", async () => {
            const result =
                await service.checkCertificateRevocation(testCertPem);

            expect(result.isValid).toBe(true);
            expect(result.error).toContain("No CRL Distribution Points");
        });

        it("should handle invalid certificate PEM", async () => {
            const result = await service.checkCertificateRevocation(
                "not a valid certificate",
            );

            expect(result.isValid).toBe(false);
            expect(result.error).toContain("CRL validation failed");
        });
    });

    describe("extractCrlDistributionPoints", () => {
        it("should return empty array for certificate without CDP extension", () => {
            const urls = service.extractCrlDistributionPoints(testCert);
            expect(urls).toEqual([]);
        });
    });

    describe("CRL fetching", () => {
        it("should handle fetch timeout", async () => {
            vi.mocked(httpService.get).mockReturnValue(
                throwError(() => ({
                    name: "CanceledError",
                    code: "ERR_CANCELED",
                })),
            );

            await expect(
                service["fetchCrl"]("http://example.com/timeout.crl"),
            ).rejects.toThrow("CRL fetch timed out");
        });

        it("should handle fetch errors", async () => {
            vi.mocked(httpService.get).mockReturnValue(
                throwError(() => new Error("Network error")),
            );

            await expect(
                service["fetchCrl"]("http://example.com/error.crl"),
            ).rejects.toThrow("Failed to fetch CRL");
        });
    });

    describe("cache management", () => {
        it("should clear cache", () => {
            // Manually add something to cache for testing
            service["crlCache"].set("http://example.com/test.crl", {
                crl: {} as any,
                fetchedAt: Date.now(),
            });

            expect(service.getCacheStats().size).toBe(1);
            service.clearCache();
            expect(service.getCacheStats().size).toBe(0);
        });

        it("should return cache statistics", () => {
            // Manually add entries to cache
            service["crlCache"].set("http://example.com/stats1.crl", {
                crl: {} as any,
                fetchedAt: Date.now(),
            });
            service["crlCache"].set("http://example.com/stats2.crl", {
                crl: {} as any,
                fetchedAt: Date.now(),
            });

            const stats = service.getCacheStats();
            expect(stats.size).toBe(2);
            expect(stats.urls).toContain("http://example.com/stats1.crl");
            expect(stats.urls).toContain("http://example.com/stats2.crl");
        });

        it("should use cached CRL when valid", () => {
            const mockCrl = { tbsCertList: { revokedCertificates: [] } };
            service["crlCache"].set("http://example.com/cached.crl", {
                crl: mockCrl as any,
                fetchedAt: Date.now(),
                nextUpdate: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
            });

            // Cache should be valid
            const cached = service["crlCache"].get(
                "http://example.com/cached.crl",
            );
            expect(service["isCacheValid"](cached!)).toBe(true);
        });

        it("should invalidate expired cache entries", () => {
            const mockCrl = { tbsCertList: { revokedCertificates: [] } };
            service["crlCache"].set("http://example.com/expired.crl", {
                crl: mockCrl as any,
                fetchedAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
                nextUpdate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
            });

            const cached = service["crlCache"].get(
                "http://example.com/expired.crl",
            );
            expect(service["isCacheValid"](cached!)).toBe(false);
        });
    });

    describe("parseReasonCode", () => {
        it("should parse known reason codes", () => {
            // keyCompromise = 1, encoded as 0x0a 0x01 0x01
            const buffer = new Uint8Array([0x0a, 0x01, 0x01]).buffer;
            const reason = service["parseReasonCode"](buffer);
            expect(reason).toBe("keyCompromise");
        });

        it("should return unknown for invalid reason codes", () => {
            const buffer = new Uint8Array([0x0a, 0x01, 0xff]).buffer;
            const reason = service["parseReasonCode"](buffer);
            expect(reason).toBe("unknown(255)");
        });

        it("should return unknown for malformed data", () => {
            const buffer = new Uint8Array([0x00]).buffer;
            const reason = service["parseReasonCode"](buffer);
            expect(reason).toBe("unknown");
        });
    });

    describe("arrayBufferToHex", () => {
        it("should convert buffer to hex string", () => {
            const buffer = new Uint8Array([
                0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
            ]).buffer;
            const hex = service["arrayBufferToHex"](buffer);
            expect(hex).toBe("0123456789abcdef");
        });

        it("should handle empty buffer", () => {
            const buffer = new Uint8Array([]).buffer;
            const hex = service["arrayBufferToHex"](buffer);
            expect(hex).toBe("");
        });
    });
});
