import {
    DeviceRequest,
    DeviceResponse,
    DocRequest,
    ItemsRequest,
    SessionTranscript,
    Verifier,
} from "@animo-id/mdoc";
import { Injectable, Logger } from "@nestjs/common";
import { TrustStoreService } from "../../../../shared/trust/trust-store.service";
import { VerifierOptions } from "../../../../shared/trust/types";
import { mdocContext } from "../../mdoc-context";
import { BaseVerifierService } from "../base-verifier.service";

export type MdocSessionData = {
    protocol: "openid4vp";
    nonce: string;
    responseMode: string;
    clientId: string;
    responseUri: string;
};

export type MdocVerificationResult = {
    verified: boolean;
    claims: Record<string, unknown>;
    payload: string;
    docType?: string;
};

@Injectable()
export class MdocverifierService extends BaseVerifierService {
    protected readonly logger = new Logger(MdocverifierService.name);

    constructor(trustStore: TrustStoreService) {
        super(trustStore);
    }

    /**
     * Verifies an mDOC credential.
     * @param vp The base64url encoded device response
     * @param sessionData Session data for transcript generation
     * @param options Verification options including trust list
     * @returns Verification result with claims
     */
    async verify(
        vp: string,
        sessionData: MdocSessionData,
        options: VerifierOptions,
    ): Promise<MdocVerificationResult> {
        try {
            // 1) Decode the device response
            const uint8Array = Buffer.from(vp, "base64url");
            const deviceResponse = DeviceResponse.decode(uint8Array);
            const mdocDocument = deviceResponse.documents?.[0];

            if (!mdocDocument) {
                throw new Error("mDOC document not found in device response");
            }

            // 2) Extract claims from the issuer signed data
            const issuerSigned = mdocDocument.issuerSigned;
            const docType = mdocDocument.docType;

            // Get claims from the appropriate namespace
            const namespace =
                docType === "org.iso.18013.5.1.mDL"
                    ? "org.iso.18013.5.1"
                    : docType;
            const claims = issuerSigned.getPrettyClaims(namespace) || {};

            // 3) Build the trusted certificates from trust store
            const trustedCertificates = await this.getTrustedCertificateBuffers(
                options.trustListSource,
            );

            if (trustedCertificates.length === 0) {
                // No trust list configured or empty - skip trust validation
                // but still return verified: true with claims
                if (!options.trustListSource) {
                    this.logger.debug(
                        "No trust list source configured, returning claims without trust validation",
                    );
                    return {
                        verified: true,
                        claims,
                        payload: vp,
                        docType,
                    };
                }

                // Build error details for debugging
                const configuredTrustLists =
                    options.trustListSource?.lotes
                        ?.map((l) => l.url)
                        .join(", ") || "none configured";

                this.logger.warn(
                    `No trusted certificates found in trust store. Configured trust lists: ${configuredTrustLists}`,
                );
                return {
                    verified: false,
                    claims,
                    payload: vp,
                    docType,
                };
            }

            // 4) Build the session transcript for verification
            const sessionTranscript = await SessionTranscript.forOid4Vp(
                sessionData,
                mdocContext,
            );

            // 5) Build a device request (currently requesting all claims that were received)
            // In a real implementation, you might want to pass the expected claims
            const deviceRequest = this.buildDeviceRequest(docType, claims);

            // 6) Verify the device response
            await Verifier.verifyDeviceResponse(
                {
                    deviceRequest,
                    deviceResponse,
                    sessionTranscript,
                    trustedCertificates,
                },
                mdocContext,
            );

            this.logger.debug(
                `MDL device response verified successfully for docType: ${docType}`,
            );

            return {
                verified: true,
                claims,
                payload: vp,
                docType,
            };
        } catch (error: any) {
            // Build detailed error info for debugging
            const configuredTrustLists =
                options.trustListSource?.lotes?.map((l) => l.url).join(", ") ||
                "none configured";

            // Try to get docType from the document if available
            let docTypeInfo = "unknown";
            try {
                const uint8Array = Buffer.from(vp, "base64url");
                const deviceResponse = DeviceResponse.decode(uint8Array);
                const mdlDoc = deviceResponse.documents?.[0];
                if (mdlDoc?.docType) {
                    docTypeInfo = mdlDoc.docType;
                }
            } catch {
                // Ignore parsing errors for debug info
            }

            const errorDetails = [
                `Error: ${error?.message ?? error}`,
                `DocType: ${docTypeInfo}`,
                `Configured trust lists: ${configuredTrustLists}`,
            ].join(" | ");

            this.logger.error(`MDL verification failed: ${errorDetails}`);
            return {
                verified: false,
                claims: {},
                payload: vp,
            };
        }
    }

    /**
     * Build a device request based on the docType and received claims.
     * This creates a request that matches what was received for verification.
     */
    private buildDeviceRequest(
        docType: string,
        claims: Record<string, unknown>,
    ): DeviceRequest {
        // Build namespace map from claims
        const namespaces: Record<string, Record<string, boolean>> = {};

        // For mDL, claims are typically under org.iso.18013.5.1
        const namespace =
            docType === "org.iso.18013.5.1.mDL" ? "org.iso.18013.5.1" : docType;

        if (Object.keys(claims).length > 0) {
            namespaces[namespace] = {};
            for (const claimKey of Object.keys(claims)) {
                namespaces[namespace][claimKey] = true;
            }
        }

        return DeviceRequest.create({
            docRequests: [
                DocRequest.create({
                    itemsRequest: ItemsRequest.create({
                        docType,
                        namespaces,
                    }),
                }),
            ],
        });
    }
}
