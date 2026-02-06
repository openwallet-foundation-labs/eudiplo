import {
    DeviceRequest,
    DeviceResponse,
    DocRequest,
    hex,
    ItemsRequest,
    SessionTranscript,
    Verifier,
} from "@animo-id/mdoc";
import { Injectable, Logger } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import { VerifierOptions } from "../../../../shared/trust/types";
import { mdocContext } from "../../mdoc-context";
import { CredentialChainValidationService } from "../credential-chain-validation.service";

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

/**
 * Error details extracted from an mDOC document for debugging.
 */
interface MdocErrorDetails {
    docType: string;
    issuerCertInfo: string;
    issuerThumbprint: string;
    issuerValidity: string;
    trustedCertsSummary: string;
}

@Injectable()
export class MdocverifierService {
    private readonly logger = new Logger(MdocverifierService.name);

    constructor(
        private readonly chainValidation: CredentialChainValidationService,
    ) {}

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
            const trustedCertificates =
                await this.chainValidation.getTrustedCertificateBuffers(
                    options.trustListSource,
                );

            if (trustedCertificates.length === 0) {
                return this.handleEmptyTrustStore(vp, claims, docType, options);
            }

            // 4) Build the session transcript for verification
            const sessionTranscript = await SessionTranscript.forOid4Vp(
                sessionData,
                mdocContext,
            );

            // 5) Build a device request (currently requesting all claims that were received)
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
            return this.handleVerificationError(vp, error, options);
        }
    }

    /**
     * Handle case when trust store is empty or not configured.
     */
    private handleEmptyTrustStore(
        vp: string,
        claims: Record<string, unknown>,
        docType: string,
        options: VerifierOptions,
    ): MdocVerificationResult {
        if (!options.trustListSource) {
            this.logger.debug(
                "No trust list source configured, returning claims without trust validation",
            );
            return { verified: true, claims, payload: vp, docType };
        }

        const configuredTrustLists =
            options.trustListSource?.lotes?.map((l) => l.url).join(", ") ||
            "none configured";

        this.logger.warn(
            `No trusted certificates found in trust store. Configured trust lists: ${configuredTrustLists}`,
        );
        return { verified: false, claims, payload: vp, docType };
    }

    /**
     * Handle verification errors with detailed logging.
     */
    private async handleVerificationError(
        vp: string,
        error: any,
        options: VerifierOptions,
    ): Promise<MdocVerificationResult> {
        const configuredTrustLists =
            options.trustListSource?.lotes?.map((l) => l.url).join(", ") ||
            "none configured";

        const details = await this.extractErrorDetails(vp, options);

        const errorDetails = [
            `Error: ${error?.message ?? error}`,
            `DocType: ${details.docType}`,
            `Issuer cert: ${details.issuerCertInfo}`,
            `Issuer thumbprint: ${details.issuerThumbprint}`,
            `Issuer validity: ${details.issuerValidity}`,
            `Configured trust lists: ${configuredTrustLists}`,
            `Trusted certs: ${details.trustedCertsSummary}`,
        ].join(" | ");

        this.logger.error(`mDOC verification failed: ${errorDetails}`);

        return {
            verified: false,
            claims: {},
            payload: vp,
            docType:
                details.docType === "unknown" ? undefined : details.docType,
        };
    }

    /**
     * Extract error details from the mDOC document for debugging.
     */
    private async extractErrorDetails(
        vp: string,
        options: VerifierOptions,
    ): Promise<MdocErrorDetails> {
        const details: MdocErrorDetails = {
            docType: "unknown",
            issuerCertInfo: "unknown",
            issuerThumbprint: "unknown",
            issuerValidity: "unknown",
            trustedCertsSummary: "unknown",
        };

        try {
            const uint8Array = Buffer.from(vp, "base64url");
            const deviceResponse = DeviceResponse.decode(uint8Array);
            const mdocDoc = deviceResponse.documents?.[0];

            if (mdocDoc?.docType) {
                details.docType = mdocDoc.docType;
            }

            // Extract issuer certificate info from the MSO
            await this.extractIssuerCertInfo(mdocDoc, details);

            // Summarize trusted certificates
            details.trustedCertsSummary = await this.summarizeTrustedCerts(
                options.trustListSource,
            );
        } catch (parseError: any) {
            this.logger.debug(
                `Could not extract additional debug info: ${parseError?.message ?? parseError}`,
            );
        }

        return details;
    }

    /**
     * Extract issuer certificate information from the mDOC document.
     */
    private async extractIssuerCertInfo(
        mdocDoc: any,
        details: MdocErrorDetails,
    ): Promise<void> {
        const issuerAuth = mdocDoc?.issuerSigned?.issuerAuth;
        if (!issuerAuth) return;

        const x5chain = issuerAuth?.x5chain;
        if (!x5chain?.length) return;

        try {
            const leafCertBytes = x5chain[0];
            const leafCert = new x509.X509Certificate(leafCertBytes);
            const thumbprint = await leafCert.getThumbprint("SHA-256");

            details.issuerThumbprint = hex.encode(new Uint8Array(thumbprint));
            details.issuerValidity = `${leafCert.notBefore.toISOString()} - ${leafCert.notAfter.toISOString()}`;
            details.issuerCertInfo = `subject="${leafCert.subject}", issuer="${leafCert.issuer}"`;
        } catch {
            // Ignore certificate parsing errors
        }
    }

    /**
     * Summarize trusted certificates for error logging.
     */
    private async summarizeTrustedCerts(
        trustListSource: VerifierOptions["trustListSource"],
    ): Promise<string> {
        const trustedCerts =
            await this.chainValidation.getTrustedCertificateBuffers(
                trustListSource,
            );

        if (trustedCerts.length === 0) {
            return "none loaded";
        }

        const certSummaries: string[] = [];
        for (const certBuf of trustedCerts.slice(0, 5)) {
            try {
                const cert = new x509.X509Certificate(new Uint8Array(certBuf));
                const thumb = hex.encode(
                    new Uint8Array(await cert.getThumbprint("SHA-256")),
                );
                certSummaries.push(
                    `${cert.subject} (${thumb.substring(0, 16)}...)`,
                );
            } catch {
                // Skip invalid certs
            }
        }

        let summary =
            certSummaries.length > 0 ? certSummaries.join("; ") : "none valid";
        if (trustedCerts.length > 5) {
            summary += ` ...and ${trustedCerts.length - 5} more`;
        }

        return summary;
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
