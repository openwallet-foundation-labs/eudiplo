import { DeviceResponse } from "@owf/mdoc";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MdocverifierService } from "./mdocverifier.service";

describe("MdocverifierService failure classification", () => {
    let service: MdocverifierService;

    beforeEach(() => {
        const chainValidation = {
            getTrustedCertificateBuffers: vi.fn().mockResolvedValue([]),
        };
        const logger = {
            setContext: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
            debug: vi.fn(),
        };

        service = new MdocverifierService(
            chainValidation as any,
            logger as any,
        );
    });

    it("maps chain_build_failed to no_trust_chain_to_root", () => {
        const failureType = (service as any).mapChainErrorToFailureType(
            "chain_build_failed",
        );

        expect(failureType).toBe("no_trust_chain_to_root");
    });

    it("keeps signature_invalid when chain probe does not fail", async () => {
        vi.spyOn(DeviceResponse, "decode").mockReturnValue({
            documents: [{}],
        } as any);

        vi.spyOn(service as any, "extractErrorDetails").mockResolvedValue({
            docType: "org.iso.18013.5.1.mDL",
            issuerCertInfo: "issuer",
            issuerThumbprint: "thumb",
            issuerValidity: "validity",
            trustedCertsSummary: "none",
        });

        vi.spyOn(
            service as any,
            "validateIssuerCertificateChain",
        ).mockResolvedValue({
            verified: true,
            matchedEntity: null,
        });

        const result = await (service as any).handleVerificationError(
            "AA",
            new Error(
                "Unable to verify deviceAuth signature (ECDSA/EdDSA): Device signature must be valid",
            ),
            {
                trustListSource: { lotes: [] },
                policy: { requireX5c: true },
            },
        );

        expect(result.failureType).toBe("signature_invalid");
    });

    it("overrides signature_invalid with trust-chain failure when probe fails", async () => {
        vi.spyOn(DeviceResponse, "decode").mockReturnValue({
            documents: [{}],
        } as any);

        vi.spyOn(service as any, "extractErrorDetails").mockResolvedValue({
            docType: "org.iso.18013.5.1.mDL",
            issuerCertInfo: "issuer",
            issuerThumbprint: "thumb",
            issuerValidity: "validity",
            trustedCertsSummary: "none",
        });

        vi.spyOn(
            service as any,
            "validateIssuerCertificateChain",
        ).mockResolvedValue({
            verified: false,
            matchedEntity: null,
            error: "chain_build_failed",
            errorDetails: "No issuer chain to trusted root",
        });

        const result = await (service as any).handleVerificationError(
            "AA",
            new Error(
                "Unable to verify deviceAuth signature (ECDSA/EdDSA): Device signature must be valid",
            ),
            {
                trustListSource: { lotes: [] },
                policy: { requireX5c: true },
            },
        );

        expect(result.failureType).toBe("no_trust_chain_to_root");
        expect(result.failureReason).toBe("No issuer chain to trusted root");
    });
});
