import { Injectable, Logger } from "@nestjs/common";
import * as x509 from "@peculiar/x509";
import { StatusListVerifierService } from "../../../shared/trust/status-list-verifier.service";
import {
    BuiltTrustStore,
    TrustStoreService,
} from "../../../shared/trust/trust-store.service";
import { TrustedEntity, TrustListSource } from "../../../shared/trust/types";
import {
    MatchedTrustedEntity,
    X509ValidationService,
} from "../../../shared/trust/x509-validation.service";

/**
 * Policy options for certificate chain validation.
 */
export interface ChainValidationPolicy {
    /** Whether to require x5c header in the credential */
    requireX5c?: boolean;
    /** How to match pinned certificates: "leaf" or "pathEnd" */
    pinnedCertMode?: "leaf" | "pathEnd";
    /** Service type filter for matching issuance certificates (default: "/Issuance") */
    serviceTypeFilter?: string;
    /** Whether to verify status list (revocation) */
    verifyStatusList?: boolean;
}

/**
 * Result of certificate chain validation.
 */
export interface ChainValidationResult {
    /** Whether the chain is valid */
    verified: boolean;
    /** The matched trusted entity (if any) */
    matchedEntity: MatchedTrustedEntity | null;
    /** Error message if validation failed */
    error?: string;
    /** Detailed error information for debugging */
    errorDetails?: string;
}

/**
 * Certificate chain information extracted from a credential.
 */
export interface CertificateChainInfo {
    /** The x5c chain from the credential (base64 encoded) */
    x5c: string[];
    /** Public key for signature verification */
    publicKey?: JsonWebKey;
}

/**
 * Shared service for certificate chain validation.
 * Used by both mDOC and SD-JWT-VC verifiers to ensure consistent behavior.
 *
 * Responsibilities:
 * - X.509 certificate chain building and validation
 * - Trust anchor matching against LoTE trust lists
 * - Status list (revocation) verification
 * - Detailed error reporting
 */
@Injectable()
export class CredentialChainValidationService {
    private readonly logger = new Logger(CredentialChainValidationService.name);

    constructor(
        private readonly trustStore: TrustStoreService,
        private readonly x509v: X509ValidationService,
        private readonly statusListVerifier: StatusListVerifierService,
    ) {}

    /**
     * Validate a certificate chain against the trust store.
     *
     * @param x5c The x5c chain from the credential (base64 DER encoded)
     * @param trustListSource The trust list source configuration
     * @param policy Validation policy options
     * @returns Validation result with matched entity information
     */
    async validateChain(
        x5c: string[],
        trustListSource: TrustListSource | undefined,
        policy: ChainValidationPolicy = {},
    ): Promise<ChainValidationResult> {
        const {
            requireX5c = false,
            pinnedCertMode = "leaf",
            serviceTypeFilter = "/Issuance",
        } = policy;

        // 1) Check x5c requirement
        if (!x5c || x5c.length === 0) {
            if (requireX5c) {
                return {
                    verified: false,
                    matchedEntity: null,
                    error: "x5c_required",
                    errorDetails: "Policy requires x5c but none was provided",
                };
            }
            // No x5c and not required - skip trust validation
            return { verified: true, matchedEntity: null };
        }

        // 2) Load trust store
        const store = await this.getTrustStoreIfConfigured(trustListSource);
        if (!store) {
            // No trust list configured - skip trust validation
            this.logger.debug(
                "No trust list source configured, returning verified without trust validation",
            );
            return { verified: true, matchedEntity: null };
        }

        // 3) Parse the presented certificate chain
        let presented: x509.X509Certificate[];
        try {
            presented = this.x509v.parseX5c(x5c);
        } catch (e: any) {
            return {
                verified: false,
                matchedEntity: null,
                error: "invalid_x5c",
                errorDetails: `Failed to parse x5c chain: ${e?.message ?? e}`,
            };
        }

        const leaf = presented[0];

        // 4) Get all certificates from entities for path building
        const allCerts = store.entities.flatMap((e) =>
            e.services.map((s) => ({ certValue: s.certValue })),
        );
        const anchors = this.x509v.parseTrustAnchors(allCerts);

        // 5) Build the certificate path
        let path: x509.X509Certificate[];
        try {
            path = await this.x509v.buildPath(leaf, presented, anchors, []);
        } catch (e: any) {
            const errorDetails = await this.buildChainErrorDetails(
                presented,
                store,
                trustListSource,
                e,
            );
            return {
                verified: false,
                matchedEntity: null,
                error: "chain_build_failed",
                errorDetails,
            };
        }

        // 6) Check time validity
        const now = new Date();
        for (const cert of path) {
            if (!this.x509v.isTimeValid(cert, now)) {
                return {
                    verified: false,
                    matchedEntity: null,
                    error: "certificate_expired",
                    errorDetails: `Certificate expired or not yet valid: subject="${cert.subject}", notBefore=${cert.notBefore.toISOString()}, notAfter=${cert.notAfter.toISOString()}`,
                };
            }
        }

        // 7) Match against TrustedEntities
        const matchedEntity = await this.x509v.pathMatchesTrustedEntities(
            path,
            store.entities,
            pinnedCertMode,
            serviceTypeFilter,
        );

        if (!matchedEntity) {
            const errorDetails = await this.buildNoMatchErrorDetails(
                path,
                store,
                trustListSource,
                pinnedCertMode,
            );
            return {
                verified: false,
                matchedEntity: null,
                error: "no_trusted_entity_match",
                errorDetails,
            };
        }

        this.logger.debug(
            `Certificate chain validated successfully. Matched entity: ${matchedEntity.entity.entityId ?? "unknown"}, mode: ${matchedEntity.matchMode}`,
        );

        return { verified: true, matchedEntity };
    }

    /**
     * Verify a status list JWT signature against the matched entity's revocation certificate.
     *
     * @param statusListJwt The status list JWT
     * @param matchedEntity The matched trusted entity (may be null)
     * @param trustListSource Trust list source for chain building
     * @param policy Validation policy
     * @returns true if status list is valid
     */
    async verifyStatusListSignature(
        x5c: string[] | undefined,
        matchedEntity: MatchedTrustedEntity | null,
        trustListSource: TrustListSource | undefined,
        policy: ChainValidationPolicy = {},
    ): Promise<boolean> {
        // If no entity was matched (no x5c in original credential), accept
        if (!matchedEntity) {
            return true;
        }

        // Check if the matched entity has a revocation certificate
        if (!matchedEntity.revocationCert) {
            this.logger.warn(
                `TrustedEntity ${matchedEntity.entity.entityId ?? "unknown"} has no revocation certificate configured`,
            );
            // Accept if entity doesn't define a revocation cert
            return true;
        }

        // Status list must have x5c
        if (!x5c?.length) {
            this.logger.warn(
                "Status list JWT missing x5c, but credential had x5c trust chain",
            );
            return false;
        }

        // Validate status list's certificate chain
        const result = await this.validateChain(x5c, trustListSource, {
            ...policy,
            serviceTypeFilter: "/Revocation",
        });

        if (!result.verified) {
            this.logger.warn(
                `Status list chain validation failed: ${result.errorDetails}`,
            );
            return false;
        }

        // Verify status list is signed by the revocation cert from the same entity
        if (result.matchedEntity) {
            const statusEntityId = result.matchedEntity.entity.entityId;
            const credentialEntityId = matchedEntity.entity.entityId;

            if (statusEntityId !== credentialEntityId) {
                this.logger.warn(
                    `Status list signed by different entity. Status: ${statusEntityId}, Credential: ${credentialEntityId}`,
                );
                return false;
            }
        }

        return true;
    }

    /**
     * Fetch a status list JWT with caching.
     * Delegates to StatusListVerifierService.
     */
    async fetchStatusListJwt(uri: string): Promise<string> {
        return this.statusListVerifier.getStatusListJwt(uri);
    }

    /**
     * Get trusted certificate buffers for mDOC verification.
     * Returns certificates as Uint8Array[] for the mdoc library.
     */
    async getTrustedCertificateBuffers(
        trustListSource?: TrustListSource,
    ): Promise<Uint8Array[]> {
        const store = await this.getTrustStoreIfConfigured(trustListSource);
        if (!store) {
            return [];
        }

        const trustedCertificates: Uint8Array[] = [];

        for (const entity of store.entities) {
            const issuanceServices = entity.services.filter((s) =>
                s.serviceTypeIdentifier.endsWith("/Issuance"),
            );

            for (const svc of issuanceServices) {
                try {
                    const cert = new x509.X509Certificate(svc.certValue as any);
                    trustedCertificates.push(new Uint8Array(cert.rawData));
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
     * Get the trust store if configured.
     */
    private async getTrustStoreIfConfigured(
        trustListSource?: TrustListSource,
    ): Promise<BuiltTrustStore | null> {
        if (!trustListSource?.lotes?.length) {
            return null;
        }

        try {
            const store = await this.trustStore.getTrustStore(trustListSource);

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
     * Build detailed error information when chain building fails.
     */
    private async buildChainErrorDetails(
        presented: x509.X509Certificate[],
        store: BuiltTrustStore,
        trustListSource: TrustListSource | undefined,
        error: any,
    ): Promise<string> {
        const leaf = presented[0];
        const leafThumb = await this.getThumbprint(leaf);

        const configuredTrustLists =
            trustListSource?.lotes?.map((l) => l.url).join(", ") ||
            "none configured";

        const trustedCertsSummary = await this.summarizeTrustedCerts(
            store.entities,
        );

        return [
            `Error: ${error?.message ?? error}`,
            `Presented leaf: subject="${leaf.subject}", issuer="${leaf.issuer}", thumbprint=${leafThumb}`,
            `Presented chain length: ${presented.length}`,
            `Configured trust lists: ${configuredTrustLists}`,
            `Trusted entities (${store.entities.length}): ${trustedCertsSummary}`,
        ].join(" | ");
    }

    /**
     * Build detailed error information when no trusted entity matches.
     */
    private async buildNoMatchErrorDetails(
        path: x509.X509Certificate[],
        store: BuiltTrustStore,
        trustListSource: TrustListSource | undefined,
        pinnedMode: string,
    ): Promise<string> {
        const leaf = path[0];
        const end = path.at(-1)!;
        const leafThumb = await this.getThumbprint(leaf);
        const endThumb = await this.getThumbprint(end);

        const configuredTrustLists =
            trustListSource?.lotes?.map((l) => l.url).join(", ") ||
            "none configured";

        const trustedCertsSummary = await this.summarizeTrustedCerts(
            store.entities,
        );

        // Collect thumbprints of allowed certificates
        const allowedThumbprints: string[] = [];
        for (const entity of store.entities) {
            for (const svc of entity.services) {
                if (svc.serviceTypeIdentifier.endsWith("/Issuance")) {
                    try {
                        const cert = new x509.X509Certificate(
                            svc.certValue as any,
                        );
                        const thumb = await this.getThumbprint(cert);
                        allowedThumbprints.push(
                            `${cert.subject} (${thumb.substring(0, 16)}...)`,
                        );
                    } catch {
                        // Skip invalid certs
                    }
                }
            }
        }

        return [
            `Presented leaf: subject="${leaf.subject}", issuer="${leaf.issuer}", thumbprint=${leafThumb}`,
            `Presented path end: subject="${end.subject}", thumbprint=${endThumb}`,
            `Pinned mode: ${pinnedMode}`,
            `Path length: ${path.length}`,
            `Configured trust lists: ${configuredTrustLists}`,
            `Loaded entities (${store.entities.length}): ${trustedCertsSummary}`,
            `Allowed cert thumbprints: ${allowedThumbprints.length > 0 ? allowedThumbprints.join("; ") : "none"}`,
        ].join(" | ");
    }

    /**
     * Summarize trusted entities for error logging.
     */
    private async summarizeTrustedCerts(
        entities: TrustedEntity[],
    ): Promise<string> {
        const summaries: string[] = [];
        for (const entity of entities.slice(0, 5)) {
            const issuanceSvcs = entity.services.filter((s) =>
                s.serviceTypeIdentifier.endsWith("/Issuance"),
            );
            summaries.push(
                `${entity.entityId ?? "unknown"} (${issuanceSvcs.length} issuance cert(s))`,
            );
        }
        if (entities.length > 5) {
            summaries.push(`...and ${entities.length - 5} more`);
        }
        return summaries.length > 0 ? summaries.join("; ") : "none";
    }

    /**
     * Get hex thumbprint of a certificate.
     */
    private async getThumbprint(cert: x509.X509Certificate): Promise<string> {
        const buffer = await cert.getThumbprint("SHA-256");
        return Array.from(new Uint8Array(buffer))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
    }
}
