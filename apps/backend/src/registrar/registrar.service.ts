import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OAuth2Client, OAuth2Token } from "@badgateway/oauth2-client";
import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { decodeJwt } from "jose";
import { Repository } from "typeorm";
import { TenantEntity } from "../auth/tenant/entitites/tenant.entity";
import { CertService } from "../crypto/key/cert/cert.service";
import { KeyChainService } from "../crypto/key/key-chain.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../shared/utils/config-import/config-import-orchestrator.service";
import { CreateAccessCertificateDto } from "./dto/create-access-certificate.dto";
import { CreateRegistrarConfigDto } from "./dto/create-registrar-config.dto";
import { UpdateRegistrarConfigDto } from "./dto/update-registrar-config.dto";
import { RegistrarConfigEntity } from "./entities/registrar-config.entity";
import {
    accessCertificateControllerRegister,
    type RegistrationCertificateCreation,
    registrationCertificateControllerAll,
    registrationCertificateControllerRegister,
    relyingPartyControllerFindAll,
    relyingPartyControllerRegister,
} from "./generated";
import { client as registrarClient } from "./generated/client.gen";

/**
 * Cached OAuth2 token with its expiration time.
 */
interface CachedToken {
    token: string;
    expiresAt: number;
}

/**
 * RegistrarService is responsible for managing the interaction with the registrar,
 * specifically for creating access certificates.
 *
 * This service supports per-tenant registrar configuration, allowing each tenant
 * to connect to their own registrar instance with their own credentials.
 */
@Injectable()
export class RegistrarService {
    private readonly logger = new Logger(RegistrarService.name);

    /**
     * Cache of OAuth2 tokens per tenant.
     */
    private readonly tokenCache = new Map<string, CachedToken>();

    constructor(
        private readonly configService: ConfigService,
        configImportOrchestrator: ConfigImportOrchestratorService,
        @InjectRepository(RegistrarConfigEntity)
        private readonly configRepository: Repository<RegistrarConfigEntity>,
        private readonly certService: CertService,
        private readonly keyChainService: KeyChainService,
    ) {
        // Register for config import at CORE phase (same as certificates)
        configImportOrchestrator.register(
            "registrar",
            ImportPhase.CORE,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    /**
     * Import registrar configuration for a tenant from the config folder.
     * Looks for a registrar.json file in the tenant's folder.
     * @param tenantId - The tenant ID to import for
     */
    private async importForTenant(tenantId: string): Promise<void> {
        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
        const force = this.configService.get<boolean>("CONFIG_IMPORT_FORCE");
        const filePath = join(configPath, tenantId, "registrar.json");

        if (!existsSync(filePath)) {
            return;
        }

        try {
            // Check if already exists
            const existing = await this.configRepository.findOneBy({
                tenantId,
            });
            if (existing && !force) {
                this.logger.debug(
                    `[${tenantId}] Registrar config already exists, skipping`,
                );
                return;
            }

            // Delete existing if force is enabled
            if (existing && force) {
                await this.configRepository.delete({ tenantId });
            }

            // Load and validate the config
            const payload = JSON.parse(readFileSync(filePath, "utf8"));
            const config = plainToClass(CreateRegistrarConfigDto, payload);

            // Save without testing credentials (they may not be valid during import)
            await this.configRepository.save({
                tenantId,
                ...config,
            });

            this.logger.log(`[${tenantId}] Registrar config imported`);
        } catch (error: any) {
            this.logger.error(
                `[${tenantId}] Failed to import registrar config: ${error.message}`,
            );
        }
    }

    /**
     * Check if a tenant has registrar configuration.
     * @param tenantId - The tenant ID to check
     * @returns True if the tenant has registrar config, false otherwise
     */
    async isEnabledForTenant(tenantId: string): Promise<boolean> {
        const config = await this.configRepository.findOneBy({ tenantId });
        return !!config;
    }

    /**
     * Called when a tenant is initialized.
     * With per-tenant configuration, this is a no-op.
     * The tenant must explicitly configure their registrar settings.
     * @param _tenant - The tenant entity (unused)
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onTenantInit(_tenant: TenantEntity): Promise<void> {
        // No-op: with per-tenant configuration, registrar setup is done explicitly
        // through the registrar config API, not automatically on tenant creation.
    }

    /**
     * Get the registrar configuration for a tenant.
     * @param tenantId - The tenant ID
     * @returns The registrar configuration or null if not configured
     */
    getConfig(tenantId: string): Promise<RegistrarConfigEntity | null> {
        return this.configRepository.findOneBy({ tenantId });
    }

    /**
     * Create or update the registrar configuration for a tenant.
     * Tests the credentials before saving.
     * @param tenantId - The tenant ID
     * @param dto - The configuration data
     * @returns The saved configuration
     */
    async saveConfig(
        tenantId: string,
        dto: CreateRegistrarConfigDto,
    ): Promise<RegistrarConfigEntity> {
        // Test credentials before saving
        await this.testCredentials(dto);

        const config = await this.configRepository.save({
            tenantId,
            ...dto,
        });

        // Clear any cached token for this tenant
        this.tokenCache.delete(tenantId);

        this.logger.log(`[${tenantId}] Registrar configuration saved`);
        return config;
    }

    /**
     * Update the registrar configuration for a tenant.
     * Tests the credentials before saving if auth-related fields are updated.
     * @param tenantId - The tenant ID
     * @param dto - The partial configuration data to update
     * @returns The updated configuration
     */
    async updateConfig(
        tenantId: string,
        dto: UpdateRegistrarConfigDto,
    ): Promise<RegistrarConfigEntity> {
        const existing = await this.configRepository.findOneBy({ tenantId });
        if (!existing) {
            throw new NotFoundException(
                `No registrar configuration found for tenant ${tenantId}`,
            );
        }

        // If any auth-related field is being updated, test the new credentials
        const hasAuthChanges =
            dto.oidcUrl !== undefined ||
            dto.clientId !== undefined ||
            dto.clientSecret !== undefined ||
            dto.username !== undefined ||
            dto.password !== undefined;

        if (hasAuthChanges) {
            // Merge existing config with updates for testing
            const testConfig = {
                registrarUrl: dto.registrarUrl ?? existing.registrarUrl,
                oidcUrl: dto.oidcUrl ?? existing.oidcUrl,
                clientId: dto.clientId ?? existing.clientId,
                clientSecret: dto.clientSecret ?? existing.clientSecret,
                username: dto.username ?? existing.username,
                password: dto.password ?? existing.password,
            };
            await this.testCredentials(testConfig);
        }

        await this.configRepository.save({
            ...existing,
            ...dto,
            tenantId,
        });

        // Clear any cached token for this tenant
        this.tokenCache.delete(tenantId);

        return this.configRepository.findOneByOrFail({ tenantId });
    }

    /**
     * Delete the registrar configuration for a tenant.
     * @param tenantId - The tenant ID
     */
    async deleteConfig(tenantId: string): Promise<void> {
        await this.configRepository.delete({ tenantId });
        this.tokenCache.delete(tenantId);
        this.logger.log(`[${tenantId}] Registrar configuration deleted`);
    }

    /**
     * Test OIDC credentials by attempting to obtain an access token.
     * @param config - The configuration to test
     * @throws BadRequestException if authentication fails
     */
    private async testCredentials(config: {
        oidcUrl: string;
        clientId: string;
        clientSecret?: string;
        username: string;
        password: string;
    }): Promise<void> {
        const oauth2Client = new OAuth2Client({
            server: `${config.oidcUrl}/protocol/openid-connect/token`,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            discoveryEndpoint: `${config.oidcUrl}/.well-known/openid-configuration`,
        });

        try {
            await oauth2Client.password({
                username: config.username,
                password: config.password,
            });
            this.logger.log("Registrar credentials validated successfully");
        } catch (error: any) {
            this.logger.warn(`Credential validation failed: ${error.message}`);
            throw new BadRequestException(
                `Failed to authenticate with registrar. Please check your credentials. Error: ${error.message}`,
            );
        }
    }

    /**
     * Get or refresh the access token for a tenant.
     * Uses Resource Owner Password Credentials (ROPC) flow.
     * @param tenantId - The tenant ID
     * @returns The access token
     */
    private async getAccessToken(tenantId: string): Promise<string> {
        // Check cache first
        const cached = this.tokenCache.get(tenantId);
        if (cached && cached.expiresAt > Date.now() + 5000) {
            return cached.token;
        }

        const config = await this.configRepository.findOneBy({ tenantId });
        if (!config) {
            throw new NotFoundException(
                `No registrar configuration found for tenant ${tenantId}`,
            );
        }

        const oauth2Client = new OAuth2Client({
            server: `${config.oidcUrl}/protocol/openid-connect/token`,
            clientId: config.clientId,
            clientSecret: config.clientSecret,
            discoveryEndpoint: `${config.oidcUrl}/.well-known/openid-configuration`,
        });

        let tokenResponse: OAuth2Token;
        try {
            // Use Resource Owner Password Credentials (ROPC) flow
            tokenResponse = await oauth2Client.password({
                username: config.username,
                password: config.password,
            });
        } catch (error: any) {
            this.logger.error(
                `[${tenantId}] Failed to obtain access token: ${error.message}`,
            );
            throw new BadRequestException(
                `Failed to authenticate with registrar: ${error.message}`,
            );
        }

        // Cache the token
        const expiresAt =
            typeof tokenResponse.expiresAt === "number"
                ? tokenResponse.expiresAt
                : Date.now() + 3600 * 1000; // Default 1 hour

        this.tokenCache.set(tenantId, {
            token: tokenResponse.accessToken,
            expiresAt,
        });

        return tokenResponse.accessToken;
    }

    /**
     * Create a configured client for the registrar API.
     * @param tenantId - The tenant ID
     * @returns Configured registrar client
     */
    private async getClient(tenantId: string) {
        const config = await this.configRepository.findOneBy({ tenantId });
        if (!config) {
            throw new NotFoundException(
                `No registrar configuration found for tenant ${tenantId}`,
            );
        }

        const client = registrarClient;
        const accessToken = await this.getAccessToken(tenantId);

        client.setConfig({
            baseUrl: config.registrarUrl,
            auth: () => accessToken,
        });

        return client;
    }

    /**
     * Get the relying party ID from the registrar.
     * Assumes the user has exactly one relying party.
     * @param tenantId - The tenant ID
     * @returns The relying party ID
     */
    private async getRelyingPartyId(tenantId: string): Promise<string> {
        const client = await this.getClient(tenantId);

        const res = await relyingPartyControllerFindAll({ client });
        if (res.error) {
            this.logger.error(
                { error: res.error },
                `[${tenantId}] Failed to fetch relying parties`,
            );
            throw new BadRequestException(
                "Failed to fetch relying parties from registrar",
            );
        }

        const relyingParties = res.data || [];
        if (relyingParties.length === 0) {
            //register one
            const res = await relyingPartyControllerRegister({
                client,
                body: {},
            });
            return res.data!.id;
        } else {
            // Return the first (and typically only) relying party
            return relyingParties[0].id;
        }
    }

    /**
     * Create an access certificate for a key.
     * Fetches the relying party from the registrar, creates the certificate,
     * and stores it in EUDIPLO.
     * @param tenantId - The tenant ID
     * @param dto - The access certificate creation data
     * @returns The access certificate response with registrar ID, local cert ID, and certificate
     */
    async createAccessCertificate(
        tenantId: string,
        dto: CreateAccessCertificateDto,
    ): Promise<{ id: string; certId: string; crt: string }> {
        const client = await this.getClient(tenantId);

        // Fetch the relying party ID from the registrar
        const relyingPartyId = await this.getRelyingPartyId(tenantId);

        const host = new URL(
            this.configService.getOrThrow<string>("PUBLIC_URL"),
        ).hostname;

        const publicKey = await this.keyChainService.getPublicKey(
            "pem",
            tenantId,
            dto.keyId,
        );

        const res = await accessCertificateControllerRegister({
            client,
            body: {
                publicKey,
                dns: [host],
                rpId: relyingPartyId,
            },
        });

        if (res.error) {
            this.logger.error(
                { error: res.error },
                `[${tenantId}] Failed to create access certificate`,
            );
            throw new BadRequestException(
                "Failed to create access certificate",
            );
        }

        const { id, crt } = res.data!;

        // Store the certificate in EUDIPLO
        const certId = await this.certService.addCertificate(tenantId, {
            crt: [crt],
            keyId: dto.keyId,
            description: `Access certificate from registrar (ID: ${id})`,
        });

        this.logger.log(
            `[${tenantId}] Created access certificate with ID: ${id}, stored as ${certId}`,
        );

        return { id, certId, crt };
    }

    /**
     * Add a registration certificate for a verification session.
     * This is called during VP flows to get a registration certificate from the registrar.
     * The returned JWT is validated for temporal validity (exp/nbf) and its
     * authorized DCQL credentials are compared with the effective DCQL query
     * for the request. Fails closed on any mismatch to prevent overasking.
     * @param req - The registration certificate request body
     * @param dcqlQuery - The effective DCQL query of the VP request (with `<TENANT_URL>` resolved and `trusted_authorities` removed)
     * @param requestId - The session request ID
     * @param tenantId - The tenant ID
     * @returns The registration certificate JWT
     */
    async addRegistrationCertificate(
        req: {
            id?: string;
            body?: Partial<RegistrationCertificateCreation>;
            jwt?: string;
        },
        dcqlQuery: any,
        requestId: string,
        tenantId: string,
    ): Promise<string> {
        const resolved = await this.resolveRegistrationCertificate(
            req,
            dcqlQuery,
            requestId,
            tenantId,
        );
        return resolved.jwt;
    }

    /**
     * Resolve a registration certificate from a spec (`jwt` import / `id` lookup
     * / `body` creation), validate it against the effective DCQL query and
     * return both the JWT and its decoded payload.
     *
     * This is the canonical entry point used both at presentation-config
     * save-time (eager caching) and at VP-request time (cache miss / refresh).
     */
    async resolveRegistrationCertificate(
        req: {
            id?: string;
            body?: Partial<RegistrationCertificateCreation>;
            jwt?: string;
        },
        dcqlQuery: any,
        requestId: string,
        tenantId: string,
    ): Promise<{
        jwt: string;
        payload: Record<string, any>;
        source: "imported" | "registrar";
    }> {
        if (req.jwt) {
            const payload = this.validateRegistrationCertificate(
                req.jwt,
                dcqlQuery,
                tenantId,
                requestId,
                "jwt",
            );
            return { jwt: req.jwt, payload, source: "imported" };
        }

        if (!req.id && !req.body) {
            throw new BadRequestException(
                "registrationCert must provide either jwt (import existing), id (reuse existing), or body (create new via registrar)",
            );
        }

        const config = await this.configRepository.findOneBy({ tenantId });
        if (!config) {
            throw new NotFoundException(
                `No registrar configuration found for tenant ${tenantId}`,
            );
        }

        const client = await this.getClient(tenantId);
        const relyingPartyId = await this.getRelyingPartyId(tenantId);

        // Check if a certificate with the given ID already exists
        if (req.id) {
            const existingCerts = await registrationCertificateControllerAll({
                client,
                query: {
                    rp: relyingPartyId,
                },
            });

            if (existingCerts.error) {
                this.logger.error(
                    { error: existingCerts.error },
                    `[${tenantId}] Failed to fetch existing registration certificates`,
                );
                throw new BadRequestException(
                    "Failed to query registration certificates",
                );
            }

            const validCerts = existingCerts.data?.filter(
                (cert) => cert.revoked == null && cert.id === req.id,
            );

            if (validCerts && validCerts.length > 0) {
                const payload = this.validateRegistrationCertificate(
                    validCerts[0].jwt,
                    dcqlQuery,
                    tenantId,
                    requestId,
                    "id",
                );
                return {
                    jwt: validCerts[0].jwt,
                    payload,
                    source: "registrar",
                };
            }

            if (!req.body) {
                throw new BadRequestException(
                    `No active registration certificate found for id '${req.id}'. Provide registrationCert.jwt or registrationCert.body to proceed.`,
                );
            }
        }

        const mergedBody: Partial<RegistrationCertificateCreation> = {
            ...(config.registrationCertificateDefaults ?? {}),
            ...(req.body ?? {}),
        };

        // If credentials are not explicitly set in registrationCert.body,
        // derive them from the effective DCQL query used for this request.
        if (!Array.isArray(mergedBody.credentials)) {
            const dcqlCredentials = Array.isArray(dcqlQuery?.credentials)
                ? dcqlQuery.credentials
                : [];
            mergedBody.credentials = dcqlCredentials.map((credential: any) => {
                // Registrar CredentialDef only supports format, claims and meta.
                return {
                    format: credential?.format,
                    claims: Array.isArray(credential?.claims)
                        ? credential.claims
                        : undefined,
                    meta:
                        credential?.meta && typeof credential.meta === "object"
                            ? credential.meta
                            : {},
                };
            }) as any;
        }

        if (!mergedBody.privacy_policy || !mergedBody.support_uri) {
            throw new BadRequestException(
                "registrationCert.body must include privacy_policy and support_uri (directly or via registrar registrationCertificateDefaults)",
            );
        }

        if (
            !Array.isArray(mergedBody.purpose) ||
            mergedBody.purpose.length === 0
        ) {
            throw new BadRequestException(
                "registrationCert.body.purpose must be provided in the presentation config",
            );
        }

        if (
            !Array.isArray(mergedBody.credentials) ||
            mergedBody.credentials.length === 0
        ) {
            throw new BadRequestException(
                "registrationCert.body.credentials could not be derived from dcql_query.credentials",
            );
        }

        // Create a new registration certificate - rpId is always derived from the tenant's registrar RP.
        const bodyWithRpId: RegistrationCertificateCreation = {
            ...mergedBody,
            rpId: relyingPartyId,
        } as RegistrationCertificateCreation;

        const res = await registrationCertificateControllerRegister({
            client,
            body: bodyWithRpId,
        });

        if (res.error) {
            const statusCode = Number(
                (res.error as any)?.statusCode ?? (res.error as any)?.status,
            );
            const upstreamMessage =
                (res.error as any)?.message ||
                (res.error as any)?.error ||
                "Unknown registrar error";

            this.logger.error(
                {
                    error: res.error,
                    statusCode: Number.isFinite(statusCode)
                        ? statusCode
                        : undefined,
                    requestBody: bodyWithRpId,
                },
                `[${tenantId}] Failed to create registration certificate`,
            );

            if (
                Number.isFinite(statusCode) &&
                statusCode >= 400 &&
                statusCode < 500
            ) {
                throw new BadRequestException(
                    `Failed to create registration certificate: ${upstreamMessage}`,
                );
            }

            throw new InternalServerErrorException(
                `Registrar temporarily unavailable while creating registration certificate${Number.isFinite(statusCode) ? ` (upstream status ${statusCode})` : ""}`,
            );
        }

        const newJwt = res.data!.jwt;
        const payload = this.validateRegistrationCertificate(
            newJwt,
            dcqlQuery,
            tenantId,
            requestId,
            "body",
        );
        return { jwt: newJwt, payload, source: "registrar" };
    }

    /**
     * Validate a registration certificate JWT against the effective DCQL query.
     *
     * Performs:
     * 1. JWT decoding (structural validation).
     * 2. Temporal validity check (`exp`, `nbf`) with a small clock skew tolerance.
     * 3. DCQL fingerprint comparison: every credential being requested in
     *    `dcqlQuery.credentials` MUST be present in the certificate's authorized
     *    `credentials` claim (canonical-JSON match). Prevents overasking with a
     *    cert that was issued for a different/narrower set of credentials.
     *
     * Fails closed by throwing `BadRequestException` on any mismatch.
     */
    private validateRegistrationCertificate(
        jwt: string,
        dcqlQuery: any,
        tenantId: string,
        requestId: string,
        source: "jwt" | "id" | "body",
    ): Record<string, any> {
        let payload: Record<string, any>;
        try {
            payload = decodeJwt(jwt) as Record<string, any>;
        } catch (err) {
            this.logger.error(
                { err, requestId, source },
                `[${tenantId}] Registration certificate is not a valid JWT`,
            );
            throw new BadRequestException(
                "Registration certificate is not a valid JWT",
            );
        }

        const now = Math.floor(Date.now() / 1000);
        const skew = 60; // seconds

        if (typeof payload.exp === "number" && payload.exp + skew < now) {
            this.logger.warn(
                { requestId, source, exp: payload.exp, now },
                `[${tenantId}] Registration certificate is expired`,
            );
            throw new BadRequestException(
                "Registration certificate is expired",
            );
        }

        if (typeof payload.nbf === "number" && payload.nbf - skew > now) {
            this.logger.warn(
                { requestId, source, nbf: payload.nbf, now },
                `[${tenantId}] Registration certificate is not yet valid`,
            );
            throw new BadRequestException(
                "Registration certificate is not yet valid",
            );
        }

        const authorizedCredentials = Array.isArray(payload.credentials)
            ? payload.credentials
            : null;

        if (!authorizedCredentials || authorizedCredentials.length === 0) {
            this.logger.warn(
                { requestId, source },
                `[${tenantId}] Registration certificate has no authorized credentials claim`,
            );
            throw new BadRequestException(
                "Registration certificate has no authorized credentials",
            );
        }
        const requestedCredentials = Array.isArray(dcqlQuery?.credentials)
            ? dcqlQuery.credentials
            : [];

        if (requestedCredentials.length === 0) {
            // Nothing being requested - nothing to authorize against.
            return payload;
        }

        const authorizedFingerprints = new Set(
            authorizedCredentials.map((c: any) =>
                this.dcqlCredentialFingerprint(c),
            ),
        );

        const unauthorized: any[] = [];
        for (const cred of requestedCredentials) {
            const fp = this.dcqlCredentialFingerprint(cred);
            if (!authorizedFingerprints.has(fp)) {
                unauthorized.push(cred);
            }
        }

        if (unauthorized.length > 0) {
            this.logger.error(
                {
                    requestId,
                    source,
                    unauthorizedIds: unauthorized.map((c) => c?.id),
                },
                `[${tenantId}] Registration certificate does not authorize the requested DCQL credentials (overasking prevented)`,
            );
            throw new BadRequestException(
                "Registration certificate does not authorize the requested DCQL credentials",
            );
        }

        return payload;
    }

    /**
     * Compute a canonical fingerprint over a `dcql_query.credentials` array.
     * Used to detect drift between a cached registration certificate and the
     * current presentation config's DCQL query.
     */
    public computeDcqlFingerprint(dcqlQuery: any): string {
        const credentials = Array.isArray(dcqlQuery?.credentials)
            ? dcqlQuery.credentials
            : [];
        const fps = credentials
            .map((c: any) => this.dcqlCredentialFingerprint(c))
            .sort();
        return this.hash(fps.join("|"));
    }

    /**
     * Compute a canonical fingerprint over a registration certificate's
     * authorized `credentials` claim. Stored in the cache and used to detect
     * cert content changes (e.g. registrar rotated the cert).
     */
    public computeAuthorizedCredentialsFingerprint(
        credentials: unknown,
    ): string {
        const arr = Array.isArray(credentials) ? credentials : [];
        const fps = arr
            .map((c: any) => this.dcqlCredentialFingerprint(c))
            .sort();
        return this.hash(fps.join("|"));
    }

    private hash(input: string): string {
        // Lightweight, stable, non-cryptographic fingerprint hash.
        // Equality is the only property we need here (no secrecy).
        return createHash("sha256").update(input).digest("hex");
    }

    /**
     * Compute a stable fingerprint over a registration-certificate spec
     * (`{ jwt?, id?, body? }`). Used to detect whether a cached certificate
     * is still derived from the current spec.
     */
    public computeSpecFingerprint(spec: unknown): string {
        return this.hash(this.canonicalJson(spec ?? null));
    }

    /**
     * Compute a stable canonical fingerprint of a single credential entry.
     *
     * We normalize to registrar CredentialDef shape (`format`, `claims`, `meta`)
     * before hashing, because DCQL credentials may include transport/query fields
     * (`id`, `multiple`, `trusted_authorities`) that are not present in registrar
     * certificates and would otherwise cause false overasking mismatches.
     */
    private dcqlCredentialFingerprint(cred: any): string {
        if (!cred || typeof cred !== "object") {
            return JSON.stringify(cred ?? null);
        }

        // Registrar responses may use `claim`, while internal/DCQL structures
        // typically use `claims`. Treat both as equivalent for authorization
        // comparison to avoid false overasking mismatches.
        const normalizedClaims = Array.isArray(
            (cred as Record<string, any>).claims,
        )
            ? (cred as Record<string, any>).claims
            : Array.isArray((cred as Record<string, any>).claim)
              ? (cred as Record<string, any>).claim
              : undefined;

        const normalized = {
            format: (cred as Record<string, any>).format,
            claims: normalizedClaims,
            meta:
                (cred as Record<string, any>).meta &&
                typeof (cred as Record<string, any>).meta === "object"
                    ? (cred as Record<string, any>).meta
                    : {},
        };

        return this.canonicalJson(normalized);
    }

    /**
     * Recursively canonicalize a JSON value: object keys sorted, arrays preserved
     * in their original order (DCQL arrays are order-significant for claims).
     */
    private canonicalJson(value: any): string {
        if (value === null || typeof value !== "object") {
            return JSON.stringify(value);
        }
        if (Array.isArray(value)) {
            return `[${value.map((v) => this.canonicalJson(v)).join(",")}]`;
        }
        const keys = Object.keys(value).sort();
        return `{${keys
            .map((k) => `${JSON.stringify(k)}:${this.canonicalJson(value[k])}`)
            .join(",")}}`;
    }
}
