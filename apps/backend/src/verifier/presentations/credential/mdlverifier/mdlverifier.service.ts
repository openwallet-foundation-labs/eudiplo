import {
    DeviceRequest,
    DeviceResponse,
    DocRequest,
    ItemsRequest,
    SessionTranscript,
    Verifier,
} from "@animo-id/mdoc";
import { Injectable, Logger } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import { TrustStoreService } from "../../../resolver/trust/trust-store.service";
import {
    ServiceTypeIdentifiers,
    VerifierOptions,
} from "../../../resolver/trust/types";
import { mdocContext } from "../../mdl-context";

/**
 * Helper to convert Uint8Array<ArrayBufferLike> to Uint8Array<ArrayBuffer>
 * This is needed due to TypeScript version differences
 */
const toBuffer = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => {
    return new Uint8Array(bytes) as unknown as Uint8Array<ArrayBuffer>;
};

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
export class MdlverifierService {
    private readonly logger = new Logger(MdlverifierService.name);

    constructor(
        private readonly trustStore: TrustStoreService,
        //private readonly x509v: X509ValidationService,
    ) {}

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
            const trustedCertificates =
                await this.getTrustedCertificates(options);

            if (trustedCertificates.length === 0) {
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
     * Get trusted certificates from the trust store.
     * Converts the trust store certificates to Uint8Array format required by the mdoc library.
     */
    private async getTrustedCertificates(
        options: VerifierOptions,
    ): Promise<Uint8Array[]> {
        try {
            const store = await this.trustStore.getTrustStore(
                options.trustListSource,
            );

            // Check NextUpdate freshness if present
            if (store.nextUpdate) {
                const nu = new Date(store.nextUpdate);
                if (!Number.isNaN(nu.getTime()) && nu.getTime() < Date.now()) {
                    this.logger.warn(
                        `Trust list NextUpdate is in the past: ${store.nextUpdate}`,
                    );
                    return [];
                }
            }

            // Get issuance certificates from all entities
            const trustedCertificates: Uint8Array[] = [];

            for (const entity of store.entities) {
                // Find issuance certificates
                const issuanceServices = entity.services.filter(
                    (s) =>
                        s.serviceTypeIdentifier ===
                        ServiceTypeIdentifiers.EaaIssuance,
                );

                for (const svc of issuanceServices) {
                    try {
                        const cert = this.parseCertificate(svc.certValue);
                        // Convert to Uint8Array for the mdoc library
                        trustedCertificates.push(
                            toBuffer(new Uint8Array(cert.rawData)),
                        );
                    } catch (e: any) {
                        this.logger.warn(
                            `Failed to parse certificate from entity ${entity.entityId}: ${e?.message ?? e}`,
                        );
                    }
                }
            }

            this.logger.debug(
                `Loaded ${trustedCertificates.length} trusted certificate(s) for MDL verification`,
            );

            return trustedCertificates;
        } catch (error: any) {
            this.logger.error(
                `Failed to load trust store: ${error?.message ?? error}`,
            );
            return [];
        }
    }

    /**
     * Parse a certificate from PEM or base64 DER format.
     */
    private parseCertificate(certValue: string): x509.X509Certificate {
        return new x509.X509Certificate(certValue as any);
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

    /**
     * Get the hex thumbprint of a certificate.
     */
    private async getThumbprint(cert: x509.X509Certificate): Promise<string> {
        const buffer = await cert.getThumbprint();
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
}
