import {
    base64,
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
import {
    ChainValidationResult,
    CredentialChainValidationService,
} from "../credential-chain-validation.service";

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

            // 3) Build the session transcript for verification
            const sessionTranscript = await SessionTranscript.forOid4Vp(
                sessionData,
                mdocContext,
            );

            // 4) Build a device request (currently requesting all claims that were received)
            const deviceRequest = this.buildDeviceRequest(docType, claims);

            // 5) Verify the device response (signature, device binding, etc.)
            // Certificate chain validation is disabled here - we do it separately via CredentialChainValidationService
            await Verifier.verifyDeviceResponse(
                {
                    deviceRequest,
                    deviceResponse,
                    sessionTranscript,
                    trustedCertificates: [],
                    disableCertificateChainValidation: true,
                },
                mdocContext,
            );

            // 6) Validate certificate chain using shared CredentialChainValidationService
            // This ensures consistent trust validation with SD-JWT-VC and other formats
            const chainResult = await this.validateIssuerCertificateChain(
                mdocDocument,
                options,
            );

            if (!chainResult.verified) {
                if (chainResult.errorDetails) {
                    this.logger.warn(
                        `Certificate chain validation failed: ${chainResult.errorDetails}`,
                    );
                }
                return {
                    verified: false,
                    claims,
                    payload: vp,
                    docType,
                };
            }

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
     * Validates the issuer certificate chain from the mDOC's IssuerAuth.
     * Extracts x5chain from the COSE Sign1 structure and validates it using
     * the shared CredentialChainValidationService.
     */
    private async validateIssuerCertificateChain(
        mdocDocument: any,
        options: VerifierOptions,
    ): Promise<ChainValidationResult> {
        // Extract x5chain from IssuerAuth (COSE Sign1 unprotected headers)
        const issuerAuth = mdocDocument?.issuerSigned?.issuerAuth;
        const x5chain: Uint8Array[] | undefined = issuerAuth?.x5chain;

        if (!x5chain || x5chain.length === 0) {
            // No x5c in the credential
            if (options.policy?.requireX5c) {
                return {
                    verified: false,
                    matchedEntity: null,
                    error: "x5c_required",
                    errorDetails:
                        "Policy requires x5c but none was found in IssuerAuth",
                };
            }
            // If x5c not required, skip trust validation
            return { verified: true, matchedEntity: null };
        }

        // Convert Uint8Array[] to base64 string[] for CredentialChainValidationService
        const x5cBase64 = x5chain.map((cert) => base64.encode(cert));

        return this.chainValidation.validateChain(
            x5cBase64,
            options.trustListSource,
            {
                requireX5c: options.policy?.requireX5c,
                pinnedCertMode: options.policy?.pinnedCertMode ?? "leaf",
                serviceTypeFilter: "/Issuance",
            },
        );
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
