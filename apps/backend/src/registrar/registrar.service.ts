import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OAuth2Client, OAuth2Token } from "@badgateway/oauth2-client";
import {
    BadRequestException,
    Injectable,
    Logger,
    NotFoundException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { Repository } from "typeorm";
import { TenantEntity } from "../auth/tenant/entitites/tenant.entity";
import { CryptoService } from "../crypto/crypto.service";
import { CertService } from "../crypto/key/cert/cert.service";
import { CertUsage } from "../crypto/key/entities/cert-usage.entity";
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
        private readonly cryptoService: CryptoService,
        configImportOrchestrator: ConfigImportOrchestratorService,
        @InjectRepository(RegistrarConfigEntity)
        private readonly configRepository: Repository<RegistrarConfigEntity>,
        private readonly certService: CertService,
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

        await this.configRepository.update({ tenantId }, dto);

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

        const publicKey = await this.cryptoService.keyService.getPublicKey(
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
            certUsageTypes: [CertUsage.Access],
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
     * @param req - The registration certificate request body
     * @param dcqlQuery - The DCQL query (for future validation)
     * @param requestId - The session request ID
     * @param tenantId - The tenant ID
     * @returns The registration certificate JWT
     */
    async addRegistrationCertificate(
        req: { id?: string; body: any },
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _dcqlQuery: any,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        _requestId: string,
        tenantId: string,
    ): Promise<string> {
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

            const validCerts = existingCerts.data?.filter(
                (cert) => cert.revoked == null && cert.id === req.id,
            );

            if (validCerts && validCerts.length > 0) {
                return validCerts[0].jwt;
            }
        }

        // Create a new registration certificate - rpId is included in the body
        const bodyWithRpId = {
            ...req.body,
            rpId: relyingPartyId,
        };

        const res = await registrationCertificateControllerRegister({
            client,
            body: bodyWithRpId,
        });

        if (res.error) {
            this.logger.error(
                { error: res.error },
                `[${tenantId}] Failed to create registration certificate`,
            );
            throw new BadRequestException(
                "Failed to create registration certificate",
            );
        }

        return res.data!.jwt;
    }
}
