import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CredentialChainValidationService } from "../credential-chain-validation.service";
import { MdocSessionData, MdocverifierService } from "./mdocverifier.service";

// Mock the @animo-id/mdoc module
vi.mock("@animo-id/mdoc", () => ({
    DeviceRequest: {
        create: vi.fn().mockReturnValue({ docRequests: [] }),
    },
    DeviceResponse: {
        decode: vi.fn(),
    },
    DocRequest: {
        create: vi.fn().mockReturnValue({}),
    },
    ItemsRequest: {
        create: vi.fn().mockReturnValue({}),
    },
    SessionTranscript: {
        forOid4Vp: vi.fn().mockResolvedValue({}),
    },
    Verifier: {
        verifyDeviceResponse: vi.fn(),
    },
    hex: {
        encode: vi.fn().mockReturnValue("mockhex"),
    },
    base64: {
        encode: vi.fn().mockReturnValue("mockbase64"),
    },
}));

describe("MdocverifierService", () => {
    let service: MdocverifierService;
    let mockChainValidation: {
        getTrustedCertificateBuffers: ReturnType<typeof vi.fn>;
        validateChain: ReturnType<typeof vi.fn>;
    };

    const mockSessionData: MdocSessionData = {
        protocol: "openid4vp",
        nonce: "test-nonce",
        responseMode: "direct_post",
        clientId: "test-client",
        responseUri: "https://example.com/response",
    };

    beforeEach(() => {
        mockChainValidation = {
            getTrustedCertificateBuffers: vi.fn(),
            validateChain: vi.fn(),
        };

        service = new MdocverifierService(
            mockChainValidation as unknown as CredentialChainValidationService,
        );
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("should be defined", () => {
        expect(service).toBeDefined();
    });

    describe("verify", () => {
        it("should return verified: true with claims when no x5chain in issuerAuth", async () => {
            const { DeviceResponse, Verifier } = await import("@animo-id/mdoc");
            const mockDocument = {
                docType: "org.iso.18013.5.1.mDL",
                issuerSigned: {
                    getPrettyClaims: vi.fn().mockReturnValue({
                        given_name: "John",
                        family_name: "Doe",
                    }),
                    issuerAuth: {
                        // No x5chain
                    },
                },
            };
            (DeviceResponse.decode as ReturnType<typeof vi.fn>).mockReturnValue(
                {
                    documents: [mockDocument],
                },
            );
            (
                Verifier.verifyDeviceResponse as ReturnType<typeof vi.fn>
            ).mockResolvedValue(undefined);

            // validateChain returns verified: true when no x5c and not required
            mockChainValidation.validateChain.mockResolvedValue({
                verified: true,
                matchedEntity: null,
            });

            const result = await service.verify(
                Buffer.from("test").toString("base64url"),
                mockSessionData,
                {
                    policy: {},
                    // No trustListSource
                },
            );

            expect(result.verified).toBe(true);
            expect(result.claims).toEqual({
                given_name: "John",
                family_name: "Doe",
            });
            expect(result.docType).toBe("org.iso.18013.5.1.mDL");
        });

        it("should return verified: false when chain validation fails", async () => {
            const { DeviceResponse, Verifier } = await import("@animo-id/mdoc");
            const mockDocument = {
                docType: "org.iso.18013.5.1.mDL",
                issuerSigned: {
                    getPrettyClaims: vi.fn().mockReturnValue({
                        given_name: "John",
                    }),
                    issuerAuth: {
                        x5chain: [new Uint8Array([1, 2, 3])],
                    },
                },
            };
            (DeviceResponse.decode as ReturnType<typeof vi.fn>).mockReturnValue(
                {
                    documents: [mockDocument],
                },
            );
            (
                Verifier.verifyDeviceResponse as ReturnType<typeof vi.fn>
            ).mockResolvedValue(undefined);

            // validateChain returns verified: false
            mockChainValidation.validateChain.mockResolvedValue({
                verified: false,
                matchedEntity: null,
                error: "no_trusted_entity_match",
                errorDetails: "No trusted certificate found",
            });

            const result = await service.verify(
                Buffer.from("test").toString("base64url"),
                mockSessionData,
                {
                    policy: {},
                    trustListSource: {
                        lotes: [{ url: "https://example.com/trust-list" }],
                    },
                },
            );

            expect(result.verified).toBe(false);
        });

        it("should return verified: false when document is not found", async () => {
            const { DeviceResponse } = await import("@animo-id/mdoc");
            (DeviceResponse.decode as ReturnType<typeof vi.fn>).mockReturnValue(
                {
                    documents: [],
                },
            );

            const result = await service.verify(
                Buffer.from("test").toString("base64url"),
                mockSessionData,
                { policy: {} },
            );

            expect(result.verified).toBe(false);
            expect(result.claims).toEqual({});
        });

        it("should verify successfully when chain validation passes", async () => {
            const { DeviceResponse, Verifier } = await import("@animo-id/mdoc");
            const mockDocument = {
                docType: "org.iso.18013.5.1.mDL",
                issuerSigned: {
                    getPrettyClaims: vi.fn().mockReturnValue({
                        given_name: "John",
                        family_name: "Doe",
                    }),
                    issuerAuth: {
                        x5chain: [new Uint8Array([1, 2, 3])],
                    },
                },
            };
            (DeviceResponse.decode as ReturnType<typeof vi.fn>).mockReturnValue(
                {
                    documents: [mockDocument],
                },
            );
            (
                Verifier.verifyDeviceResponse as ReturnType<typeof vi.fn>
            ).mockResolvedValue(undefined);

            // validateChain returns verified: true with matched entity
            mockChainValidation.validateChain.mockResolvedValue({
                verified: true,
                matchedEntity: { entity: { entityId: "test-entity" } },
            });

            const result = await service.verify(
                Buffer.from("test").toString("base64url"),
                mockSessionData,
                {
                    policy: {},
                    trustListSource: {
                        lotes: [{ url: "https://example.com/trust-list" }],
                    },
                },
            );

            expect(result.verified).toBe(true);
            expect(result.claims).toEqual({
                given_name: "John",
                family_name: "Doe",
            });
            expect(Verifier.verifyDeviceResponse).toHaveBeenCalledWith(
                expect.objectContaining({
                    disableCertificateChainValidation: true,
                }),
                expect.anything(),
            );
        });

        it("should return verified: false when verification throws", async () => {
            const { DeviceResponse, Verifier } = await import("@animo-id/mdoc");
            const mockDocument = {
                docType: "org.iso.18013.5.1.mDL",
                issuerSigned: {
                    getPrettyClaims: vi.fn().mockReturnValue({}),
                    issuerAuth: undefined,
                },
            };
            (DeviceResponse.decode as ReturnType<typeof vi.fn>).mockReturnValue(
                {
                    documents: [mockDocument],
                },
            );
            (
                Verifier.verifyDeviceResponse as ReturnType<typeof vi.fn>
            ).mockRejectedValue(new Error("Verification failed"));

            mockChainValidation.getTrustedCertificateBuffers.mockResolvedValue([
                new Uint8Array([1, 2, 3]),
            ]);

            const result = await service.verify(
                Buffer.from("test").toString("base64url"),
                mockSessionData,
                {
                    policy: {},
                    trustListSource: {
                        lotes: [{ url: "https://example.com/trust-list" }],
                    },
                },
            );

            expect(result.verified).toBe(false);
        });

        it("should return verified: false when x5c is required but not present", async () => {
            const { DeviceResponse, Verifier } = await import("@animo-id/mdoc");
            const mockDocument = {
                docType: "org.iso.18013.5.1.mDL",
                issuerSigned: {
                    getPrettyClaims: vi.fn().mockReturnValue({
                        given_name: "John",
                    }),
                    issuerAuth: {
                        // No x5chain
                    },
                },
            };
            (DeviceResponse.decode as ReturnType<typeof vi.fn>).mockReturnValue(
                {
                    documents: [mockDocument],
                },
            );
            (
                Verifier.verifyDeviceResponse as ReturnType<typeof vi.fn>
            ).mockResolvedValue(undefined);

            const result = await service.verify(
                Buffer.from("test").toString("base64url"),
                mockSessionData,
                {
                    policy: { requireX5c: true },
                    trustListSource: {
                        lotes: [{ url: "https://example.com/trust-list" }],
                    },
                },
            );

            expect(result.verified).toBe(false);
        });
    });

    describe("buildDeviceRequest", () => {
        // Access the private method for testing
        const callBuildDeviceRequest = (
            svc: MdocverifierService,
            docType: string,
            claims: Record<string, unknown>,
        ) => {
            return (svc as any).buildDeviceRequest(docType, claims);
        };

        it("should use org.iso.18013.5.1 namespace for mDL docType", async () => {
            const { DeviceRequest, DocRequest, ItemsRequest } = await import(
                "@animo-id/mdoc"
            );

            callBuildDeviceRequest(service, "org.iso.18013.5.1.mDL", {
                given_name: "John",
                family_name: "Doe",
            });

            expect(ItemsRequest.create).toHaveBeenCalledWith({
                docType: "org.iso.18013.5.1.mDL",
                namespaces: {
                    "org.iso.18013.5.1": {
                        given_name: true,
                        family_name: true,
                    },
                },
            });
        });

        it("should use docType as namespace for non-mDL documents", async () => {
            const { ItemsRequest } = await import("@animo-id/mdoc");

            callBuildDeviceRequest(service, "custom.doctype", {
                claim1: "value1",
            });

            expect(ItemsRequest.create).toHaveBeenCalledWith({
                docType: "custom.doctype",
                namespaces: {
                    "custom.doctype": {
                        claim1: true,
                    },
                },
            });
        });

        it("should handle empty claims", async () => {
            const { ItemsRequest } = await import("@animo-id/mdoc");

            callBuildDeviceRequest(service, "org.iso.18013.5.1.mDL", {});

            expect(ItemsRequest.create).toHaveBeenCalledWith({
                docType: "org.iso.18013.5.1.mDL",
                namespaces: {},
            });
        });
    });
});
