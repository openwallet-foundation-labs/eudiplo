import { lookup } from "node:dns/promises";
import { readFileSync } from "node:fs";
import { isIP } from "node:net";
import {
    BadRequestException,
    ConflictException,
    Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { base64url, decodeJwt } from "jose";
import { Span, TraceService } from "nestjs-otel";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { ServiceTypeIdentifier } from "../../issuer/trust-list/trustlist.service";
import { RegistrarService } from "../../registrar/registrar.service";
import { Session } from "../../session/entities/session.entity";
import { VerifierOptions } from "../../shared/trust/types";
import { ConfigImportService } from "../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../shared/utils/config-import/config-import-orchestrator.service";
import { MdocverifierService } from "./credential/mdocverifier/mdocverifier.service";
import { SdjwtvcverifierService } from "./credential/sdjwtvcverifier/sdjwtvcverifier.service";
import { AuthResponse } from "./dto/auth-response.dto";
import { PresentationConfigCreateDto } from "./dto/presentation-config-create.dto";
import { PresentationConfigUpdateDto } from "./dto/presentation-config-update.dto";
import {
    ClaimsQuery,
    CredentialQuery,
    CredentialSetQuery,
    PresentationConfig,
    TrustedAuthorityType,
} from "./entities/presentation-config.entity";
import { IncompletePresentationException } from "./exceptions/incomplete-presentation.exception";

type CredentialType = "dc+sd-jwt" | "mso_mdoc";

/**
 * Service for managing Verifiable Presentations (VPs) and handling SD-JWT-VCs.
 */
@Injectable()
export class PresentationsService {
    private readonly METADATA_FETCH_TIMEOUT_MS = 5000;

    private readonly METADATA_FETCH_MAX_REDIRECTS = 3;

    /**
     * Constructor for the PresentationsService.
     * @param httpService - Instance of HttpService for making HTTP requests.
     * @param resolverService - Instance of ResolverService for resolving DID documents.
     * @param vpRequestRepository - Repository for managing VP request configurations.
     */
    constructor(
        @InjectRepository(PresentationConfig)
        private readonly vpRequestRepository: Repository<PresentationConfig>,
        private readonly configImportService: ConfigImportService,
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
        private readonly sdjwtvcverifierService: SdjwtvcverifierService,
        private readonly mdocverifierService: MdocverifierService,
        private readonly configService: ConfigService,
        private readonly registrarService: RegistrarService,
        private readonly logger: PinoLogger,
        private readonly traceService: TraceService,
    ) {
        this.logger.setContext(PresentationsService.name);
        // Register presentation config import in REFERENCES phase
        // This runs after CORE (keys, certs) and CONFIGURATION phases
        this.configImportOrchestrator.register(
            "presentation-configs",
            ImportPhase.REFERENCES,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    /**
     * Imports presentation configurations for a specific tenant.
     */
    private async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<PresentationConfigCreateDto>(
            tenantId,
            {
                subfolder: "presentation",
                fileExtension: ".json",
                validationClass: PresentationConfigCreateDto,
                resourceType: "presentation config",
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    const id = (filePath.split("/").pop() || "").replace(
                        ".json",
                        "",
                    );
                    payload.id = id;
                    return plainToClass(PresentationConfigCreateDto, payload);
                },
                checkExists: (tid, data) => {
                    return this.getPresentationConfig(data.id, tid)
                        .then(() => true)
                        .catch(() => false);
                },
                deleteExisting: async (tid, data) => {
                    await this.vpRequestRepository.delete({
                        id: data.id,
                        tenantId: tid,
                    });
                },
                processItem: async (tid, config) => {
                    await this.storePresentationConfig(tid, config);
                },
            },
        );
    }

    /**
     * Retrieves all presentation configurations for a given tenant.
     * @param tenantId - The ID of the tenant for which to retrieve configurations.
     * @returns A promise that resolves to an array of PresentationConfig entities.
     */
    getPresentationConfigs(tenantId: string): Promise<PresentationConfig[]> {
        return this.vpRequestRepository.find({
            where: { tenantId },
            order: { createdAt: "DESC" },
        });
    }

    /**
     * Stores a new presentation configuration.
     * @param tenantId - The ID of the tenant for which to store the configuration.
     * @param vprequest - The PresentationConfig entity to store.
     * @returns A promise that resolves to the stored PresentationConfig entity.
     */
    async storePresentationConfig(
        tenantId: string,
        vprequest: PresentationConfigCreateDto,
    ) {
        const merged = {
            ...vprequest,
            tenantId,
        } as PresentationConfig;

        // Persist first for fast UI response; cache is resolved asynchronously.
        merged.registrationCertCache = null;
        const saved = await this.vpRequestRepository.save(merged);

        if (saved.registrationCert) {
            this.scheduleRegistrationCertRefresh(saved.id, tenantId);
        }

        return saved;
    }

    /**
     * Updates an existing presentation configuration.
     * @param id
     * @param tenantId
     * @param vprequest
     * @returns
     */
    async updatePresentationConfig(
        id: string,
        tenantId: string,
        vprequest: PresentationConfigUpdateDto,
    ) {
        // Verify the config exists
        const existing = await this.getPresentationConfig(id, tenantId);

        // Merge existing with updates - client must explicitly set fields to null to clear them
        // Omitted fields keep their existing values
        const merged: PresentationConfig = {
            ...existing,
            ...vprequest,
            id,
            tenantId,
        } as PresentationConfig;

        // Return quickly; resolve registration-certificate cache asynchronously.
        const cacheRelevantChanged =
            Object.prototype.hasOwnProperty.call(
                vprequest,
                "registrationCert",
            ) || Object.prototype.hasOwnProperty.call(vprequest, "dcql_query");

        if (!merged.registrationCert) {
            merged.registrationCertCache = null;
        } else if (cacheRelevantChanged) {
            // Mark pending in UI while async refresh runs.
            merged.registrationCertCache = null;
        }

        const saved = await this.vpRequestRepository.save(merged);

        if (saved.registrationCert && cacheRelevantChanged) {
            this.scheduleRegistrationCertRefresh(saved.id, tenantId);
        }

        return saved;
    }

    /**
     * Force-reissue the registration certificate for a presentation config,
     * bypassing the cache. Used by the management UI's "Reissue now" action.
     *
     * Throws if the config has no `registrationCert` spec or the registrar is
     * not enabled for this tenant.
     */
    async reissueRegistrationCertificate(
        id: string,
        tenantId: string,
    ): Promise<PresentationConfig> {
        const presentationConfig = await this.getPresentationConfig(
            id,
            tenantId,
        );
        if (!presentationConfig.registrationCert) {
            throw new BadRequestException(
                "Presentation config has no registrationCert spec",
            );
        }
        if (!(await this.registrarService.isEnabledForTenant(tenantId))) {
            throw new BadRequestException(
                "Registrar is not enabled for this tenant",
            );
        }

        // Resolve `<TENANT_URL>` placeholders so registrar validation/issuance
        // sees the same DCQL the runtime path will see.
        const host = this.configService.getOrThrow<string>("PUBLIC_URL");
        const tenantHost = `${host}/issuers/${tenantId}`;
        const resolvedDcql = JSON.parse(
            JSON.stringify(presentationConfig.dcql_query).replaceAll(
                "<TENANT_URL>",
                tenantHost,
            ),
        );

        // Force a fresh resolve by clearing the cache first.
        presentationConfig.registrationCertCache = null;
        const jwt = await this.getOrIssueRegistrationCertificate(
            presentationConfig,
            resolvedDcql,
            `reissue-${id}`,
        );
        if (!jwt) {
            throw new BadRequestException(
                "Failed to reissue registration certificate",
            );
        }
        return this.getPresentationConfig(id, tenantId);
    }

    /**
     * Resolve the registration-certificate JWT to attach to a VP request,
     * using the embedded {@link PresentationConfig.registrationCertCache}
     * when it is still valid. On a cache miss/expiry the cert is freshly
     * resolved via {@link RegistrarService} and the cache is persisted.
     *
     * Returns `undefined` when the config has no `registrationCert` spec or
     * the registrar is not enabled for this tenant.
     */
    async getOrIssueRegistrationCertificate(
        presentationConfig: PresentationConfig,
        resolvedDcqlQuery: any,
        requestId: string,
    ): Promise<string | undefined> {
        if (!presentationConfig.registrationCert) {
            return undefined;
        }
        if (
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
            presentationConfig.registrationCert,
        );

        const cache = presentationConfig.registrationCertCache;
        const now = Math.floor(Date.now() / 1000);
        const skew = 60;
        if (
            cache &&
            cache.dcqlFingerprint === dcqlFingerprint &&
            cache.specFingerprint === specFingerprint &&
            (typeof cache.expiresAt !== "number" ||
                cache.expiresAt - skew > now)
        ) {
            return cache.jwt;
        }

        const resolved =
            await this.registrarService.resolveRegistrationCertificate(
                presentationConfig.registrationCert as any,
                resolvedDcqlQuery,
                requestId,
                presentationConfig.tenantId,
            );

        const newCache = {
            jwt: resolved.jwt,
            fingerprint:
                this.registrarService.computeAuthorizedCredentialsFingerprint(
                    resolved.payload.credentials,
                ),
            dcqlFingerprint,
            specFingerprint,
            issuedAt:
                typeof resolved.payload.iat === "number"
                    ? resolved.payload.iat
                    : undefined,
            expiresAt:
                typeof resolved.payload.exp === "number"
                    ? resolved.payload.exp
                    : undefined,
            source: resolved.source,
        };

        await this.vpRequestRepository.update(
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
     * Recompute (or invalidate) the embedded registration-certificate cache on
     * the about-to-be-saved presentation config.
     *
     * Behavior:
     *  - If `registrationCert` is unset → clears any stale cache.
     *  - If a cache exists for an unchanged `registrationCert` spec, unchanged
     *    `dcql_query`, and is not expired → keeps the existing cache.
     *  - Otherwise eagerly resolves the certificate via {@link RegistrarService}
     *    and stores the new cache. On registrar/network failure the cache is
     *    cleared and the save proceeds; the runtime path will retry.
     *
     * Errors raised by the registrar that indicate user-config problems
     * (`BadRequestException`) propagate to fail the save.
     */
    private async refreshRegistrationCertCache(
        next: PresentationConfig,
        existing: PresentationConfig | undefined,
    ): Promise<void> {
        const spec = next.registrationCert;
        if (!spec) {
            next.registrationCertCache = null;
            return;
        }

        const dcqlFingerprint = this.registrarService.computeDcqlFingerprint(
            next.dcql_query,
        );
        const specFingerprint =
            this.registrarService.computeSpecFingerprint(spec);

        const now = Math.floor(Date.now() / 1000);
        const skew = 60;
        const cache = existing?.registrationCertCache;
        const cacheStillValid =
            cache &&
            cache.dcqlFingerprint === dcqlFingerprint &&
            cache.specFingerprint === specFingerprint &&
            (typeof cache.expiresAt !== "number" ||
                cache.expiresAt - skew > now);

        if (cacheStillValid) {
            next.registrationCertCache = cache;
            return;
        }

        // Resolve `<TENANT_URL>` placeholders so registrar validation/issuance
        // sees the same DCQL the runtime path will see.
        let resolvedDcql: any;
        try {
            const host = this.configService.getOrThrow<string>("PUBLIC_URL");
            const tenantHost = `${host}/issuers/${next.tenantId}`;
            resolvedDcql = JSON.parse(
                JSON.stringify(next.dcql_query).replaceAll(
                    "<TENANT_URL>",
                    tenantHost,
                ),
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
                );
            const payload = resolved.payload;
            next.registrationCertCache = {
                jwt: resolved.jwt,
                fingerprint:
                    this.registrarService.computeAuthorizedCredentialsFingerprint(
                        payload.credentials,
                    ),
                dcqlFingerprint,
                specFingerprint,
                issuedAt:
                    typeof payload.iat === "number" ? payload.iat : undefined,
                expiresAt:
                    typeof payload.exp === "number" ? payload.exp : undefined,
                source: resolved.source,
            };
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
     * Trigger registration-certificate cache refresh in the background.
     * This keeps create/update endpoints responsive while cert issuance
     * happens asynchronously.
     */
    private scheduleRegistrationCertRefresh(
        id: string,
        tenantId: string,
    ): void {
        void this.refreshRegistrationCertCacheAsync(id, tenantId);
    }

    private async refreshRegistrationCertCacheAsync(
        id: string,
        tenantId: string,
    ): Promise<void> {
        try {
            const latest = await this.vpRequestRepository.findOneBy({
                id,
                tenantId,
            });

            if (!latest || !latest.registrationCert) {
                return;
            }

            const refreshed = {
                ...latest,
            } as PresentationConfig;

            await this.refreshRegistrationCertCache(refreshed, latest);
            await this.vpRequestRepository.save(refreshed);
        } catch (err) {
            this.logger.warn(
                { err, tenantId, configId: id },
                "Asynchronous registration-certificate cache refresh failed; runtime will retry",
            );
        }
    }

    /**
     * Deletes a presentation configuration by its ID and tenant ID.
     * @param id - The ID of the presentation configuration to delete.
     * @param tenantId - The ID of the tenant for which to delete the configuration.
     * @returns A promise that resolves when the deletion is complete.
     */
    deletePresentationConfig(id: string, tenantId: string) {
        return this.vpRequestRepository.delete({ id, tenantId });
    }

    /**
     * Retrieves a presentation configuration by its ID and tenant ID.
     * @param id - The ID of the presentation configuration to retrieve.
     * @param tenantId - The ID of the tenant for which to retrieve the configuration.
     * @returns A promise that resolves to the requested PresentationConfig entity.
     */
    getPresentationConfig(
        id: string,
        tenantId: string,
    ): Promise<PresentationConfig> {
        return this.vpRequestRepository
            .findOneByOrFail({
                id,
                tenantId,
            })
            .catch(() => {
                throw new ConflictException(`Request ID ${id} not found`);
            });
    }

    /**
     * Resolve OID4VCI credential issuer metadata server-side.
     * This is used by the web client to avoid browser CORS restrictions.
     */
    async resolveCredentialIssuerMetadata(issuerUrl: string) {
        const metadataUrl = this.buildCredentialIssuerMetadataUrl(issuerUrl);
        const metadata = await this.fetchCredentialIssuerMetadata(metadataUrl);

        if (!metadata || typeof metadata !== "object") {
            throw new BadRequestException(
                `Issuer metadata response from ${metadataUrl} is invalid`,
            );
        }

        return metadata;
    }

    private async fetchCredentialIssuerMetadata(metadataUrl: string) {
        let currentUrl = metadataUrl;

        for (
            let redirectCount = 0;
            redirectCount <= this.METADATA_FETCH_MAX_REDIRECTS;
            redirectCount++
        ) {
            await this.assertSafeMetadataUrl(currentUrl);

            const response = await fetch(currentUrl, {
                method: "GET",
                headers: {
                    accept: "application/json",
                },
                redirect: "manual",
                signal: AbortSignal.timeout(this.METADATA_FETCH_TIMEOUT_MS),
            }).catch((error) => {
                throw new BadRequestException(
                    `Failed to fetch issuer metadata from ${currentUrl}: ${error instanceof Error ? error.message : "unknown error"}`,
                );
            });

            if (response.status >= 300 && response.status < 400) {
                const location = response.headers.get("location");
                if (!location) {
                    throw new BadRequestException(
                        `Issuer metadata response from ${currentUrl} returned a redirect without a location header`,
                    );
                }

                currentUrl = new URL(location, currentUrl).toString();
                continue;
            }

            if (!response.ok) {
                throw new BadRequestException(
                    `Failed to fetch issuer metadata from ${currentUrl}: HTTP ${response.status}`,
                );
            }

            return response.json().catch(() => {
                throw new BadRequestException(
                    `Issuer metadata response from ${currentUrl} is not valid JSON`,
                );
            });
        }

        throw new BadRequestException(
            `Issuer metadata fetch exceeded ${this.METADATA_FETCH_MAX_REDIRECTS} redirects`,
        );
    }

    private async assertSafeMetadataUrl(inputUrl: string): Promise<void> {
        const parsedUrl = new URL(inputUrl);

        if (parsedUrl.username || parsedUrl.password) {
            throw new BadRequestException(
                "issuerUrl must not include userinfo credentials",
            );
        }

        // In non-production environments, allow local/private hosts for testing
        const isProduction =
            this.configService.get<string>("NODE_ENV") === "production";
        if (!isProduction) {
            return;
        }

        const hostname = parsedUrl.hostname.toLowerCase();
        if (
            hostname === "localhost" ||
            hostname.endsWith(".localhost") ||
            hostname.endsWith(".local")
        ) {
            throw new BadRequestException(
                "issuerUrl must resolve to a public host",
            );
        }

        const resolvedAddresses = isIP(hostname)
            ? [hostname]
            : (
                  await lookup(hostname, { all: true, verbatim: true }).catch(
                      () => {
                          throw new BadRequestException(
                              "issuerUrl host could not be resolved",
                          );
                      },
                  )
              ).map((entry) => entry.address);

        if (resolvedAddresses.length === 0) {
            throw new BadRequestException(
                "issuerUrl host could not be resolved",
            );
        }

        if (
            resolvedAddresses.some((address) =>
                this.isPrivateIpAddress(address),
            )
        ) {
            throw new BadRequestException(
                "issuerUrl must resolve to a public host",
            );
        }
    }

    private isPrivateIpAddress(address: string): boolean {
        const normalizedAddress =
            address.startsWith("::ffff:") && isIP(address.slice(7)) === 4
                ? address.slice(7)
                : address;

        const family = isIP(normalizedAddress);
        if (family === 4) {
            const octets = normalizedAddress.split(".").map(Number);
            const [first, second] = octets;

            return (
                first === 0 ||
                first === 10 ||
                first === 127 ||
                (first === 100 && second >= 64 && second <= 127) ||
                (first === 169 && second === 254) ||
                (first === 172 && second >= 16 && second <= 31) ||
                (first === 192 && second === 168) ||
                (first === 198 && (second === 18 || second === 19))
            );
        }

        if (family === 6) {
            const normalized = normalizedAddress.toLowerCase();
            return (
                normalized === "::" ||
                normalized === "::1" ||
                normalized.startsWith("fc") ||
                normalized.startsWith("fd") ||
                normalized.startsWith("fe8") ||
                normalized.startsWith("fe9") ||
                normalized.startsWith("fea") ||
                normalized.startsWith("feb")
            );
        }

        return true;
    }

    /**
     * Build OID4VCI metadata endpoint URL.
     * Accepts an issuer base URL and canonicalizes it to the exact
     * OID4VCI credential issuer metadata endpoint.
     */
    private buildCredentialIssuerMetadataUrl(inputUrl: string): string {
        const trimmed = inputUrl.trim();
        let parsedUrl: URL;

        try {
            parsedUrl = new URL(trimmed);
        } catch {
            throw new BadRequestException("issuerUrl must be a valid URL");
        }

        if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
            throw new BadRequestException(
                "issuerUrl must use http or https protocol",
            );
        }

        if (parsedUrl.search || parsedUrl.hash) {
            throw new BadRequestException(
                "issuerUrl must not include query parameters or fragments",
            );
        }

        const wellKnownPrefix = "/.well-known/openid-credential-issuer";
        const normalizedPath = parsedUrl.pathname.replace(/\/$/, "");
        const issuerPath = normalizedPath.startsWith(wellKnownPrefix)
            ? normalizedPath.slice(wellKnownPrefix.length) || ""
            : normalizedPath;

        return `${parsedUrl.origin}${wellKnownPrefix}${issuerPath}`;
    }

    /**
     * Stores the new registration certificate.
     * @param registrationCertId - The ID of the registration certificate to store.
     * @param id - The ID of the presentation configuration to update.
     * @param tenantId - The ID of the tenant for which to store the registration certificate.
     * @returns
     */
    public async storeRCID(
        registrationCertId: string,
        id: string,
        tenantId: string,
    ) {
        const element = await this.vpRequestRepository.findOneByOrFail({
            id,
            tenantId,
        });
        await this.vpRequestRepository.save(element);
    }

    /**
     * Parse the response from the wallet. It will verify the SD-JWT-VCs in the vp_token and return the parsed attestations.
     * @param res
     * @param requiredFields
     * @returns
     */
    @Span("presentations.parseResponse")
    async parseResponse(
        res: AuthResponse,
        presentationConfig: PresentationConfig,
        session: Session,
    ) {
        // Add session context to logs (Loki) and span attributes (Tempo)
        // assign() requires nestjs-pino request scope; the @Span decorator may
        // run the method in a separate AsyncLocalStorage context, so guard it.
        try {
            this.logger.assign({ sessionId: session.id });
        } catch {
            // Outside HTTP request scope — sessionId won't appear in logs,
            // but span attributes below still carry it for Tempo.
        }
        this.traceService.getSpan()?.setAttributes({
            "session.id": session.id,
            "session.tenantId": session.tenantId,
            "session.requestId": session.requestId ?? "",
        });

        const attestationIds = Object.keys(res.vp_token);
        const host = this.configService.getOrThrow<string>("PUBLIC_URL");
        const tenantHost = `${host}/issuers/${presentationConfig.tenantId}`;

        // Validate credential completeness - ensure all required credentials are present
        this.validateCredentialCompleteness(
            attestationIds,
            presentationConfig.dcql_query.credentials,
            presentationConfig.dcql_query.credential_sets,
        );

        // Get transaction_data from the request object JWT payload
        // This ensures we use the exact same encoded strings that were sent to the wallet
        let transactionDataStrings: string[] | undefined;
        if (session.requestObject) {
            const requestPayload = decodeJwt(session.requestObject) as {
                transaction_data?: string[];
            };
            transactionDataStrings = requestPayload.transaction_data;
        }

        const results = await Promise.all(
            attestationIds.map(async (attId) => {
                const credentials = res.vp_token[attId] as unknown as string[];
                const dcqlCredential =
                    presentationConfig.dcql_query.credentials.find(
                        (c) => c.id === attId,
                    );

                if (!dcqlCredential) {
                    throw new ConflictException(
                        `${attId} not found in the presentation config`,
                    );
                }

                // Find transaction data entries that reference this credential
                // The strings are already base64url-encoded from the request object
                // We need to decode them to check credential_ids, then use the original encoded string for hash validation
                const relevantTransactionData = transactionDataStrings?.filter(
                    (tdStr) => {
                        try {
                            const td = JSON.parse(
                                Buffer.from(base64url.decode(tdStr)).toString(),
                            ) as { credential_ids?: string[] };
                            return td.credential_ids?.includes(attId);
                        } catch {
                            return false;
                        }
                    },
                );

                const verifyOptions: VerifierOptions = {
                    trustListSource: {
                        lotes:
                            dcqlCredential.trusted_authorities
                                ?.find(
                                    (auth) =>
                                        auth.type ===
                                        TrustedAuthorityType.ETSI_TL,
                                )
                                ?.values.map((url) => ({
                                    url: url.replaceAll(
                                        "<TENANT_URL>",
                                        tenantHost,
                                    ),
                                })) || [],
                        acceptedServiceTypes: [
                            ServiceTypeIdentifier.EaaIssuance,
                            ServiceTypeIdentifier.PIDIssuance,
                        ],
                    },
                    policy: {
                        requireX5c: true,
                    },
                    // Pass transaction data for hash validation (only for credentials that have it)
                    transactionData: relevantTransactionData,
                };

                const type = this.getType(session.requestObject!, attId);

                // Extract required claim keys from DCQL claims
                const requiredClaimKeys = this.getRequiredClaimKeys(
                    dcqlCredential.claims,
                    type,
                );

                const values = await Promise.all(
                    credentials.map(async (cred) => {
                        if (type === "mso_mdoc") {
                            const result =
                                await this.mdocverifierService.verify(
                                    cred,
                                    {
                                        nonce: session.vp_nonce as string,
                                        clientId: session.clientId!,
                                        responseUri: session.responseUri!,
                                        protocol: "openid4vp",
                                        responseMode: session.useDcApi
                                            ? "dc_api.jwt"
                                            : "direct_post.jwt",
                                    },
                                    verifyOptions,
                                );

                            if (!result.verified) {
                                throw new BadRequestException(
                                    `mDOC verification failed for credential "${attId}"`,
                                );
                            }

                            // Validate all required claims are present in mDOC
                            this.validateMdocClaims(
                                attId,
                                dcqlCredential.claims,
                                result.claims,
                            );

                            return result.claims;
                        } else if (type === "dc+sd-jwt") {
                            const result =
                                await this.sdjwtvcverifierService.verify(cred, {
                                    requiredClaimKeys,
                                    keyBindingNonce: session.vp_nonce!,
                                    ...verifyOptions,
                                } as any);
                            this.logger.debug(
                                {
                                    credentialId: attId,
                                    requiredClaimKeys,
                                    disclosedClaimKeys: Object.keys(
                                        result.payload ?? {},
                                    ),
                                },
                                "SD-JWT-VC disclosed claims after verification",
                            );
                            this.logger.trace(
                                {
                                    credentialId: attId,
                                    requiredClaimKeys,
                                    disclosedClaims: result.payload,
                                },
                                "[TRACE] SD-JWT-VC full disclosed claims payload",
                            );
                            return {
                                ...result.payload,
                                cnf: undefined,
                                status: undefined,
                            };
                        }
                        throw new ConflictException(
                            `Unsupported credential type: ${type}`,
                        );
                    }),
                );

                return { id: attId, values };
            }),
        );

        return results;
    }

    /**
     * Get the credential type based on the configuration id.
     * @param jwt
     * @param att
     * @returns
     */
    getType(jwt: string, att: string): CredentialType {
        const payload = decodeJwt<any>(jwt);
        return payload.dcql_query.credentials.find(
            (credential) => credential.id === att,
        ).format;
    }

    /**
     * Validates that the presentation response contains all required credentials.
     * If credential_sets are defined, validates that at least one option set is fully satisfied.
     * If no credential_sets are defined, all credentials in the query are required.
     *
     * @param receivedCredentialIds - Array of credential IDs received in the response
     * @param requiredCredentials - Array of credential queries from DCQL
     * @param credentialSets - Optional credential set queries from DCQL
     * @throws IncompletePresentationException if validation fails
     */
    private validateCredentialCompleteness(
        receivedCredentialIds: string[],
        requiredCredentials: CredentialQuery[],
        credentialSets?: CredentialSetQuery[],
    ): void {
        const allCredentialIds = requiredCredentials.map((c) => c.id);
        const receivedSet = new Set(receivedCredentialIds);

        if (credentialSets && credentialSets.length > 0) {
            // Validate credential_sets - for each required set, at least one option must be satisfied
            const unsatisfiedSets: number[] = [];

            for (let i = 0; i < credentialSets.length; i++) {
                const credentialSet = credentialSets[i];

                // Default to required if not explicitly set to false
                if (credentialSet.required === false) {
                    continue;
                }

                // Check if at least one option set is fully satisfied
                const isSatisfied = credentialSet.options.some((optionSet) =>
                    optionSet.every((credId) => receivedSet.has(credId)),
                );

                if (!isSatisfied) {
                    unsatisfiedSets.push(i);
                }
            }

            if (unsatisfiedSets.length > 0) {
                throw new IncompletePresentationException(
                    `Credential sets not satisfied: ${unsatisfiedSets.map((i) => `set[${i}]`).join(", ")}`,
                    { unsatisfiedCredentialSets: unsatisfiedSets },
                );
            }
        } else {
            // No credential_sets defined - all credentials in the query are required
            const missingCredentials = allCredentialIds.filter(
                (id) => !receivedSet.has(id),
            );

            if (missingCredentials.length > 0) {
                throw new IncompletePresentationException(
                    `Missing required credentials: ${missingCredentials.join(", ")}`,
                    { missingCredentials },
                );
            }
        }
    }

    /**
     * Converts DCQL claim queries to required claim keys for verification.
     *
     * For SD-JWT-VC: paths are joined with dots (e.g., ["address", "locality"] -> "address.locality")
     * For mDOC: the first path element is the namespace, so we return the claim name (second element)
     *
     * @param claims - Array of claim queries from DCQL
     * @param credentialType - The type of credential ("dc+sd-jwt" or "mso_mdoc")
     * @returns Array of required claim keys in the format expected by the verifier
     */
    private getRequiredClaimKeys(
        claims: ClaimsQuery[] | undefined,
        credentialType: CredentialType,
    ): string[] {
        if (!claims || claims.length === 0) {
            return [];
        }

        return claims.map((claim) => {
            if (credentialType === "mso_mdoc") {
                // For mDOC, path is [namespace, claimName]
                // We return just the claim name for internal tracking
                // Actual validation happens in validateMdocClaims
                return claim.path.length > 1
                    ? claim.path.slice(1).join(".")
                    : claim.path[0];
            }
            // For SD-JWT-VC, join path with dots
            return claim.path.join(".");
        });
    }

    /**
     * Validates that all required claims from the DCQL query are present in the mDOC response.
     *
     * @param credentialId - The credential ID for error reporting
     * @param requiredClaims - Array of claim queries from DCQL
     * @param receivedClaims - Claims received in the mDOC response
     * @throws IncompletePresentationException if any required claims are missing
     */
    private validateMdocClaims(
        credentialId: string,
        requiredClaims: ClaimsQuery[] | undefined,
        receivedClaims: Record<string, unknown>,
    ): void {
        if (!requiredClaims || requiredClaims.length === 0) {
            return;
        }

        const missingClaims: string[] = [];

        for (const claim of requiredClaims) {
            // For mDOC, path is [namespace, claimName] or just [claimName]
            // The verifier already flattens claims from all namespaces
            const claimName =
                claim.path.length > 1 ? claim.path[1] : claim.path[0];

            this.logger.debug(
                {
                    credentialId,
                    claimName,
                    receivedClaimKeys: Object.keys(receivedClaims),
                },
                "Validating mDOC claim presence",
            );
            this.logger.trace(
                { credentialId, claimName, receivedClaims },
                "[TRACE] mDOC full received claims payload",
            );
            // Check if claim exists in received claims
            if (!(claimName in receivedClaims)) {
                // Format as namespace.claimName for better error message
                const fullPath = claim.path.join(".");
                missingClaims.push(fullPath);
            }
        }

        if (missingClaims.length > 0) {
            throw new IncompletePresentationException(
                `Missing required claims for credential '${credentialId}': ${missingClaims.join(", ")}`,
                { missingClaims: { [credentialId]: missingClaims } },
            );
        }
    }
}
