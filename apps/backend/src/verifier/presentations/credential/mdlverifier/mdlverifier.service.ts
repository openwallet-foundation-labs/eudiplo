import {
    DeviceRequest,
    DeviceResponse,
    DocRequest,
    ItemsRequest,
    SessionTranscript,
    Verifier,
} from "@animo-id/mdoc";
import { Injectable, Logger } from "@nestjs/common";
import { TrustStoreService } from "../../../resolver/trust/trust-store.service";
import { VerifierOptions } from "../../../resolver/trust/types";
import { mdocContext } from "../../mdl-context";
import { BaseVerifierService } from "../base-verifier.service";

export type MdlSessionData = {
    protocol: "openid4vp";
    nonce: string;
    responseMode: string;
    clientId: string;
    responseUri: string;
};

export type MdlVerificationResult = {
    verified: boolean;
    claims: Record<string, unknown>;
    payload: string;
    docType?: string;
};

@Injectable()
export class MdlverifierService extends BaseVerifierService {
    protected readonly logger = new Logger(MdlverifierService.name);

    constructor(trustStore: TrustStoreService) {
        super(trustStore);
    }

    /**
     * Verifies an MDL/mDOC credential.
     * @param vp The base64url encoded device response
     * @param sessionData Session data for transcript generation
     * @param options Verification options including trust list
     * @returns Verification result with claims
     */
    async verify(
        vp: string,
        sessionData: MdlSessionData,
        options: VerifierOptions,
    ): Promise<MdlVerificationResult> {
        try {
            // 1) Decode the device response
            const uint8Array = Buffer.from(vp, "base64url");
            const deviceResponse = DeviceResponse.decode(uint8Array);
            const mdlDocument = deviceResponse.documents?.[0];

            if (!mdlDocument) {
                throw new Error("MDL document not found in device response");
            }

            // 2) Extract claims from the issuer signed data
            const issuerSigned = mdlDocument.issuerSigned;
            const docType = mdlDocument.docType;

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

                this.logger.warn(
                    "No trusted certificates found in trust store",
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
            console.log("MDL verification error:", error);
            this.logger.error(
                `MDL verification failed: ${error?.message ?? error}`,
            );
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

        return new DeviceRequest({
            docRequests: [
                new DocRequest({
                    itemsRequest: new ItemsRequest({
                        docType,
                        namespaces,
                    }),
                }),
            ],
        });
    }
}
