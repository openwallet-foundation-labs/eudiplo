import { Logger } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import {
    BuiltTrustStore,
    TrustStoreService,
} from "../../../shared/trust/trust-store.service";
import {
    ServiceTypeIdentifiers,
    TrustListSource,
} from "../../../shared/trust/types";

/**
 * Helper to convert Uint8Array<ArrayBufferLike> to Uint8Array<ArrayBuffer>
 * This is needed due to TypeScript version differences
 */
export const toBuffer = (bytes: Uint8Array): Uint8Array<ArrayBuffer> => {
    return new Uint8Array(bytes) as unknown as Uint8Array<ArrayBuffer>;
};

/**
 * Base class for credential verifiers (MDL/mDOC and SD-JWT-VC).
 * Provides common functionality for trust store operations and certificate handling.
 */
export abstract class BaseVerifierService {
    protected abstract readonly logger: Logger;

    constructor(protected readonly trustStore: TrustStoreService) {}

    /**
     * Get the trust store, checking if trustListSource is provided.
     * Returns null if no trust list source is configured (skip trust validation).
     * @param trustListSource Optional trust list source
     * @returns The trust store or null if not configured
     */
    protected async getTrustStoreIfConfigured(
        trustListSource?: TrustListSource,
    ): Promise<BuiltTrustStore | null> {
        if (!trustListSource || !trustListSource.lotes?.length) {
            this.logger.debug(
                "No trust list source configured, skipping trust validation",
            );
            return null;
        }

        try {
            const store = await this.trustStore.getTrustStore(trustListSource);

            // Check NextUpdate freshness if present
            if (store.nextUpdate) {
                const nu = new Date(store.nextUpdate);
                if (!Number.isNaN(nu.getTime()) && nu.getTime() < Date.now()) {
                    this.logger.warn(
                        `Trust list NextUpdate is in the past: ${store.nextUpdate}`,
                    );
                    return null;
                }
            }

            return store;
        } catch (error: any) {
            this.logger.error(
                `Failed to load trust store: ${error?.message ?? error}`,
            );
            return null;
        }
    }

    /**
     * Get trusted certificates from the trust store as Uint8Array[].
     * Used primarily for mDOC verification.
     * @param trustListSource Trust list source
     * @returns Array of certificate buffers, empty if no trust source or on error
     */
    protected async getTrustedCertificateBuffers(
        trustListSource?: TrustListSource,
    ): Promise<Uint8Array[]> {
        const store = await this.getTrustStoreIfConfigured(trustListSource);
        if (!store) {
            return [];
        }

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
            `Loaded ${trustedCertificates.length} trusted certificate(s) for verification`,
        );

        return trustedCertificates;
    }

    /**
     * Parse a certificate from PEM or base64 DER format.
     * @param certValue Certificate in PEM or base64 DER format
     * @returns Parsed X509Certificate
     */
    protected parseCertificate(certValue: string): x509.X509Certificate {
        return new x509.X509Certificate(certValue as any);
    }

    /**
     * Get the hex thumbprint of a certificate.
     * @param cert X509 certificate
     * @returns Hex-encoded thumbprint
     */
    protected async getThumbprint(cert: x509.X509Certificate): Promise<string> {
        const buffer = await cert.getThumbprint();
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
}
