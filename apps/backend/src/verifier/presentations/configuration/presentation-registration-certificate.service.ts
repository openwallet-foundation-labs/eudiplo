import {
    BadRequestException,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import {
    type CertificateInfo,
    CertService,
} from "../../../crypto/key/cert/cert.service.js";
import { KeyUsageType } from "../../../crypto/key/types/key-usage-type.js";
import { RegistrarService } from "../../../registrar/registrar.service.js";
import {
    PresentationConfig,
    RegistrationCertCache,
} from "../entities/presentation-config.entity.js";
import {
    PRESENTATION_SETTINGS,
    type PresentationSettings,
} from "../presentation-settings.js";

type ResolvedRegistrationCertificate = Awaited<
    ReturnType<RegistrarService["resolveRegistrationCertificate"]>
>;

/** Seconds before `exp` at which a cached certificate is treated as expired. */
const CACHE_EXPIRY_SKEW_SECONDS = 60;

/**
 * Registration certificates for presentation configurations.
 *
 * The registrar-issued (or imported) certificate is cached on the
 * presentation config (`registrationCertCache`). The cache is valid while the
 * `registration_cert` spec and the `dcql_query` are unchanged, the access
 * certificate that signs the request is the one the certificate was resolved
 * for, and the JWT has not expired.
 *
 * The cache holds one certificate: the one for the configuration's current
 * access certificate (its `accessKeyChainId`, or the tenant's default access
 * key chain). A session pinned to another access key chain, for example one
 * created before the default changed, gets a certificate resolved for its own
 * key chain that is not cached, so new sessions keep using the cache. Such
 * sessions only exist for a short time after the default changes (a request
 * object is fetched once per session), so one registrar call each is accepted
 * instead of a cache per access key chain.
 */
@Injectable()
export class PresentationRegistrationCertificateService {
    constructor(
        @InjectRepository(PresentationConfig)
        private readonly repository: Repository<PresentationConfig>,
        private readonly registrarService: RegistrarService,
        private readonly certService: CertService,
        @Inject(PRESENTATION_SETTINGS)
        private readonly settings: PresentationSettings,
        private readonly logger: PinoLogger,
    ) {
        this.logger.setContext(PresentationRegistrationCertificateService.name);
    }

    /**
     * Resolve the registration-certificate JWT to attach to a VP request,
     * using the embedded {@link PresentationConfig.registrationCertCache}
     * when it is still valid. On a cache miss/expiry the cert is freshly
     * resolved via {@link RegistrarService} and the cache is persisted.
     *
     * Returns `undefined` when the config has no `registrationCert` spec, or
     * when the spec needs the registrar (no imported `jwt`) and the registrar
     * is not enabled for this tenant.
     *
     * @param accessCertificate - The access certificate that signs the
     * request. The registration certificate is linked to it. Defaults to the
     * configuration's current access certificate.
     */
    async getOrIssueRegistrationCertificate(
        presentationConfig: PresentationConfig,
        resolvedDcqlQuery: any,
        requestId: string,
        accessCertificate?: CertificateInfo,
    ): Promise<string | undefined> {
        if (!presentationConfig.registration_cert) {
            return undefined;
        }
        if (
            needsRegistrar(presentationConfig.registration_cert) &&
            !(await this.registrarService.isEnabledForTenant(
                presentationConfig.tenantId,
            ))
        ) {
            return undefined;
        }

        const dcqlFingerprint = this.registrarService.computeDcqlFingerprint(
            presentationConfig.dcql_query,
        );
        const specFingerprint = this.registrarService.computeSpecFingerprint(
            presentationConfig.registration_cert,
        );

        const signer = accessCertificate
            ? this.toAccessCertificateRef(accessCertificate)
            : await this.currentAccessCertificate(presentationConfig);

        const cache = presentationConfig.registrationCertCache;
        if (isCacheValid(cache, dcqlFingerprint, specFingerprint, signer)) {
            return cache.jwt;
        }

        const resolved =
            await this.registrarService.resolveRegistrationCertificate(
                presentationConfig.registration_cert as any,
                resolvedDcqlQuery,
                requestId,
                presentationConfig.tenantId,
                {
                    accessKeyChainId:
                        signer?.keyChainId ??
                        presentationConfig.accessKeyChainId ??
                        undefined,
                },
            );

        if (
            accessCertificate &&
            signer?.fingerprint !==
                (await this.currentAccessCertificate(presentationConfig))
                    ?.fingerprint
        ) {
            // The session signs with an access key chain that is no longer the
            // configuration's current one. Do not replace the cache that new
            // sessions use.
            this.logger.info(
                {
                    tenantId: presentationConfig.tenantId,
                    configId: presentationConfig.id,
                    accessKeyChainId: signer?.keyChainId,
                },
                "Resolved a registration certificate for a session pinned to a previous access key chain; not cached",
            );
            return resolved.jwt;
        }

        const newCache = this.toCache(
            resolved,
            dcqlFingerprint,
            specFingerprint,
            signer,
        );

        await this.repository.update(
            {
                id: presentationConfig.id,
                tenantId: presentationConfig.tenantId,
            },
            { registrationCertCache: newCache },
        );
        presentationConfig.registrationCertCache = newCache;

        return resolved.jwt;
    }

    /**
     * Force-reissue the registration certificate of an already loaded
     * presentation config, bypassing the cache.
     *
     * Throws if the config has no `registrationCert` spec, the spec needs the
     * registrar and the registrar is not enabled for this tenant, or no
     * certificate could be resolved.
     */
    async reissue(presentationConfig: PresentationConfig): Promise<void> {
        const { id, tenantId } = presentationConfig;
        if (!presentationConfig.registration_cert) {
            throw new BadRequestException(
                "Presentation config has no registrationCert spec",
            );
        }

        // Resolve `<TENANT_URL>` placeholders so registrar validation/issuance
        // sees the same DCQL the runtime path will see.
        const resolvedDcql = this.resolveTenantUrl(
            presentationConfig.dcql_query,
            tenantId,
        );

        const reissueConfig = {
            ...presentationConfig,
            registration_cert: presentationConfig.registration_cert?.body
                ? {
                      body: presentationConfig.registration_cert.body,
                      ...(presentationConfig.registration_cert.id
                          ? { id: presentationConfig.registration_cert.id }
                          : {}),
                  }
                : presentationConfig.registration_cert,
        } as PresentationConfig;
        if (
            needsRegistrar(reissueConfig.registration_cert!) &&
            !(await this.registrarService.isEnabledForTenant(tenantId))
        ) {
            throw new BadRequestException(
                "Registrar is not enabled for this tenant",
            );
        }

        // Force a fresh resolve by clearing the cache first.
        presentationConfig.registrationCertCache = null;
        reissueConfig.registrationCertCache = null;
        const jwt = await this.getOrIssueRegistrationCertificate(
            reissueConfig,
            resolvedDcql,
            `reissue-${id}`,
        );
        if (!jwt) {
            throw new BadRequestException(
                "Failed to reissue registration certificate",
            );
        }
    }

    /**
     * Check an imported registration certificate (`registration_cert.jwt`)
     * before the configuration is saved: time and overasking against the
     * DCQL query with `<TENANT_URL>` resolved. This needs no registrar call,
     * so a certificate that would be refused when the request is built fails
     * the save with `400` instead. `id` and `body` are resolved at the
     * registrar in the background after the save.
     */
    async validateImported(
        presentationConfig: Pick<
            PresentationConfig,
            "id" | "tenantId" | "dcql_query" | "registration_cert"
        >,
    ): Promise<void> {
        const jwt = presentationConfig.registration_cert?.jwt;
        if (!jwt) {
            return;
        }
        await this.registrarService.resolveRegistrationCertificate(
            { jwt },
            this.resolveTenantUrl(
                presentationConfig.dcql_query,
                presentationConfig.tenantId,
            ),
            presentationConfig.id,
            presentationConfig.tenantId,
        );
    }

    /**
     * Trigger registration-certificate cache refresh in the background.
     * This keeps create/update endpoints responsive while cert issuance
     * happens asynchronously.
     */
    scheduleRefresh(id: string, tenantId: string): void {
        void this.refreshAsync(id, tenantId);
    }

    private async refreshAsync(id: string, tenantId: string): Promise<void> {
        try {
            const latest = await this.repository.findOneBy({
                id,
                tenantId,
            });

            if (!latest || !latest.registration_cert) {
                return;
            }

            const refreshed = {
                ...latest,
            } as PresentationConfig;

            await this.refreshCache(refreshed, latest);
            await this.repository.save(refreshed);
        } catch (err) {
            this.logger.warn(
                { err, tenantId, configId: id },
                "Asynchronous registration-certificate cache refresh failed; runtime will retry",
            );
        }
    }

    /**
     * Recompute (or invalidate) the embedded registration-certificate cache on
     * the about-to-be-saved presentation config.
     *
     * Behavior:
     *  - If `registrationCert` is unset → clears any stale cache.
     *  - If a cache exists for an unchanged `registrationCert` spec, unchanged
     *    `dcql_query`, the current access certificate, and is not expired →
     *    keeps the existing cache.
     *  - Otherwise eagerly resolves the certificate via {@link RegistrarService}
     *    and stores the new cache. On registrar/network failure, or when the
     *    access certificate cannot be read, the cache is cleared and the save
     *    proceeds; the runtime path will retry.
     *
     * Errors raised by the registrar that indicate user-config problems
     * (`BadRequestException`) propagate to fail the save.
     */
    private async refreshCache(
        next: PresentationConfig,
        existing: PresentationConfig | undefined,
    ): Promise<void> {
        const spec = next.registration_cert;
        if (!spec) {
            next.registrationCertCache = null;
            return;
        }

        const dcqlFingerprint = this.registrarService.computeDcqlFingerprint(
            next.dcql_query,
        );
        const specFingerprint =
            this.registrarService.computeSpecFingerprint(spec);

        let signer: AccessCertificateRef | undefined;
        try {
            signer = await this.currentAccessCertificate(next);
        } catch (err) {
            this.logger.warn(
                { err, tenantId: next.tenantId, configId: next.id },
                "Failed to read the access certificate at save time; cache cleared, runtime will retry",
            );
            next.registrationCertCache = null;
            return;
        }
        const cache = existing?.registrationCertCache;
        if (isCacheValid(cache, dcqlFingerprint, specFingerprint, signer)) {
            next.registrationCertCache = cache;
            return;
        }

        let resolvedDcql: any;
        try {
            resolvedDcql = this.resolveTenantUrl(
                next.dcql_query,
                next.tenantId,
            );
        } catch {
            // No PUBLIC_URL in this context — fall back to the templated form.
            resolvedDcql = next.dcql_query;
        }

        try {
            const resolved =
                await this.registrarService.resolveRegistrationCertificate(
                    spec as any,
                    resolvedDcql,
                    next.id ?? "presentation-config-save",
                    next.tenantId,
                    {
                        accessKeyChainId:
                            signer?.keyChainId ??
                            next.accessKeyChainId ??
                            undefined,
                    },
                );
            next.registrationCertCache = this.toCache(
                resolved,
                dcqlFingerprint,
                specFingerprint,
                signer,
            );
        } catch (err) {
            if (err instanceof BadRequestException) {
                // User-config error — fail the save so the user sees the issue.
                throw err;
            }
            this.logger.warn(
                { err, tenantId: next.tenantId, configId: next.id },
                "Failed to eagerly resolve registration certificate at save time; cache cleared, runtime will retry",
            );
            next.registrationCertCache = null;
        }
    }

    /**
     * Resolve `<TENANT_URL>` placeholders so registrar validation/issuance
     * sees the same DCQL the runtime path will see.
     */
    private resolveTenantUrl(dcqlQuery: unknown, tenantId: string): any {
        const tenantHost = `${this.settings.publicUrl}/issuers/${tenantId}`;
        return JSON.parse(
            JSON.stringify(dcqlQuery).replaceAll("<TENANT_URL>", tenantHost),
        );
    }

    /**
     * The access certificate that signs requests of new sessions for this
     * configuration: its pinned access key chain or the tenant's default.
     * `undefined` when the tenant has no access key chain; the registrar then
     * links no access certificate either.
     */
    private async currentAccessCertificate(
        presentationConfig: PresentationConfig,
    ): Promise<AccessCertificateRef | undefined> {
        const cert = await this.certService
            .find({
                tenantId: presentationConfig.tenantId,
                type: KeyUsageType.Access,
                keyId: presentationConfig.accessKeyChainId ?? undefined,
                skipValidation: true,
            })
            .catch((err: unknown) => {
                // Only a missing key chain means "no access certificate";
                // other errors must not produce a cache without the link.
                if (err instanceof NotFoundException) return undefined;
                throw err;
            });
        return cert && this.toAccessCertificateRef(cert);
    }

    private toAccessCertificateRef(
        cert: CertificateInfo,
    ): AccessCertificateRef {
        return {
            keyChainId: cert.keyId,
            fingerprint: this.certService.getCertHash(cert),
        };
    }

    private toCache(
        resolved: ResolvedRegistrationCertificate,
        dcqlFingerprint: string,
        specFingerprint: string,
        accessCertificate: AccessCertificateRef | undefined,
    ): RegistrationCertCache {
        const payload = resolved.payload;
        return {
            jwt: resolved.jwt,
            ...(accessCertificate
                ? {
                      accessKeyChainId: accessCertificate.keyChainId,
                      accessCertificateHash: accessCertificate.fingerprint,
                  }
                : {}),
            fingerprint:
                this.registrarService.computeAuthorizedCredentialsFingerprint(
                    payload.credentials,
                ),
            dcqlFingerprint,
            specFingerprint,
            issuedAt: typeof payload.iat === "number" ? payload.iat : undefined,
            expiresAt:
                typeof payload.exp === "number" ? payload.exp : undefined,
            source: resolved.source,
        };
    }
}

/**
 * An imported `jwt` is used as is; only `id` and `body` are resolved at the
 * registrar.
 */
function needsRegistrar(spec: { jwt?: string | null }): boolean {
    return !spec.jwt;
}

/** The access certificate a registration certificate is resolved for. */
interface AccessCertificateRef {
    keyChainId: string;
    /** SHA-256 of the leaf certificate, base64url (as in `x509_hash`). */
    fingerprint: string;
}

function isCacheValid(
    cache: RegistrationCertCache | null | undefined,
    dcqlFingerprint: string,
    specFingerprint: string,
    accessCertificate: AccessCertificateRef | undefined,
): cache is RegistrationCertCache {
    const now = Math.floor(Date.now() / 1000);
    return (
        !!cache &&
        cache.dcqlFingerprint === dcqlFingerprint &&
        cache.specFingerprint === specFingerprint &&
        // A cache from before the access certificate was recorded, or for
        // another one, may link the wrong access certificate.
        cache.accessCertificateHash === accessCertificate?.fingerprint &&
        (typeof cache.expiresAt !== "number" ||
            cache.expiresAt - CACHE_EXPIRY_SKEW_SECONDS > now)
    );
}
