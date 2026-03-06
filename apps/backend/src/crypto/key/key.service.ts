import { readFileSync } from "node:fs";
import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Signer } from "@sd-jwt/types";
import { plainToClass } from "class-transformer";
import { JWK, JWSHeaderParameters, JWTPayload } from "jose";
import { Repository } from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { ConfigImportService } from "../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../shared/utils/config-import/config-import-orchestrator.service";
import { KeyGenerateDto } from "./dto/key-generate.dto";
import { KeyImportDto } from "./dto/key-import.dto";
import { UpdateKeyDto } from "./dto/key-update.dto";
import { CertEntity } from "./entities/cert.entity";
import { KeyUsageEntity, KeyUsageType } from "./entities/key-usage.entity";
import { KeyEntity, KeyUsage } from "./entities/keys.entity";
import { KmsAdapter } from "./kms-adapter";
import { KmsRegistry } from "./kms-registry.service";

/**
 * KeyService is the **single facade** every consumer injects.
 *
 * Routing logic:
 * - **Create / Import** → resolve the {@link KmsAdapter} by provider name
 *   from the request body (or fall back to the default), delegate, then stamp
 *   `kmsProvider` on the persisted {@link KeyEntity}.
 * - **Use (sign, getPublicKey, signer, …)** → look up the key from the DB,
 *   read its `kmsProvider` column, resolve the matching adapter, delegate.
 * - **Metadata (getKeys, getKey, update)** → direct DB operations.
 * - **Config import** → orchestrated via {@link ConfigImportOrchestratorService}.
 */
@Injectable()
export class KeyService {
    private readonly logger = new Logger(KeyService.name);

    constructor(
        private readonly kmsRegistry: KmsRegistry,
        @InjectRepository(KeyEntity)
        private readonly keyRepository: Repository<KeyEntity>,
        @InjectRepository(KeyUsageEntity)
        private readonly keyUsageRepository: Repository<KeyUsageEntity>,
        private readonly configImportService: ConfigImportService,
        @InjectRepository(CertEntity)
        private readonly certRepository: Repository<CertEntity>,
        @InjectRepository(TenantEntity)
        private readonly tenantRepository: Repository<TenantEntity>,
        configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        configImportOrchestrator.register(
            "keys",
            ImportPhase.CORE,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    // ───────────────────────────── helpers ──────────────────────────────

    /**
     * Resolve the adapter for an existing key by looking up its kmsProvider.
     */
    private async resolveAdapterForKey(
        tenantId: string,
        keyId: string,
    ): Promise<KmsAdapter> {
        const key = await this.keyRepository.findOneByOrFail({
            tenantId,
            id: keyId,
        });
        return this.kmsRegistry.getProvider(
            key.kmsProvider || this.kmsRegistry.getDefaultProviderName(),
        );
    }

    /**
     * Resolve an adapter by explicit name or fall back to the default.
     */
    private resolveAdapterByName(kmsProvider?: string): KmsAdapter {
        return kmsProvider
            ? this.kmsRegistry.getProvider(kmsProvider)
            : this.kmsRegistry.getDefaultProvider();
    }

    /**
     * Save key usage types for a key.
     */
    private async saveKeyUsages(
        tenantId: string,
        keyId: string,
        usageTypes: KeyUsageType[],
    ): Promise<void> {
        // Remove existing usages
        await this.keyUsageRepository.delete({ tenantId, keyId });

        // Add new usages
        if (usageTypes.length > 0) {
            const newUsages = usageTypes.map((usage) =>
                this.keyUsageRepository.create({
                    keyId,
                    usage,
                    tenantId,
                }),
            );
            await this.keyUsageRepository.save(newUsages);
        }
    }

    /**
     * Add a usage type to a key if it doesn't already have it.
     * This preserves existing usages and only adds the new one.
     * @param tenantId - The tenant ID
     * @param keyId - The key ID
     * @param usageType - The usage type to add
     */
    async addKeyUsage(
        tenantId: string,
        keyId: string,
        usageType: KeyUsageType,
    ): Promise<void> {
        // Check if the usage already exists
        const existing = await this.keyUsageRepository.findOne({
            where: { tenantId, keyId, usage: usageType },
        });

        if (!existing) {
            await this.keyUsageRepository.save({
                keyId,
                usage: usageType,
                tenantId,
            });
        }
    }

    /**
     * Find a key by usage type for a tenant.
     * @param tenantId - The tenant ID
     * @param usageType - The usage type to find (access, signing, trustList, statusList)
     * @param keyId - Optional specific key ID to match
     * @returns The matching key entity
     * @throws NotFoundException if no key found with the given usage type
     */
    async findByUsageType(
        tenantId: string,
        usageType: KeyUsageType,
        keyId?: string,
    ): Promise<KeyEntity> {
        const keyUsage = await this.keyUsageRepository.findOne({
            where: {
                tenantId,
                usage: usageType,
                keyId: keyId || undefined,
            },
            relations: ["key", "key.certificates"],
        });

        if (!keyUsage) {
            throw new NotFoundException(
                `No key found with usage type '${usageType}' for tenant ${tenantId}`,
            );
        }

        return keyUsage.key;
    }

    // ───────────────────────── create / import ─────────────────────────

    /**
     * Initialise the default KMS for a tenant.
     */
    async init(tenantId: string): Promise<string> {
        return this.kmsRegistry.getDefaultProvider().init(tenantId);
    }

    /**
     * Generate a new key on the server.
     * Delegates to the adapter matching `body.kmsProvider` (or default),
     * then stamps the provider name and description on the entity.
     */
    async create(
        tenantId: string,
        body: KeyGenerateDto = {} as KeyGenerateDto,
    ): Promise<string> {
        const providerName =
            body.kmsProvider || this.kmsRegistry.getDefaultProviderName();
        const adapter = this.resolveAdapterByName(providerName);
        const keyId = await adapter.create(tenantId);
        await this.keyRepository.update(
            { tenantId, id: keyId },
            {
                kmsProvider: providerName,
                ...(body.description ? { description: body.description } : {}),
            },
        );

        // Save usage types if provided
        if (body.usageTypes && body.usageTypes.length > 0) {
            await this.saveKeyUsages(tenantId, keyId, body.usageTypes);
        }

        return keyId;
    }

    /**
     * Import existing key material.
     */
    async import(
        tenantId: string,
        body: KeyImportDto,
        kmsProvider?: string,
    ): Promise<string> {
        const providerName =
            kmsProvider ||
            body.kmsProvider ||
            this.kmsRegistry.getDefaultProviderName();
        const adapter = this.kmsRegistry.getProvider(providerName);
        const keyId = await adapter.import(tenantId, body);
        await this.keyRepository.update(
            { tenantId, id: keyId },
            { kmsProvider: providerName },
        );

        // Save usage types if provided
        if (body.usageTypes && body.usageTypes.length > 0) {
            await this.saveKeyUsages(tenantId, keyId, body.usageTypes);
        }

        return keyId;
    }

    // ──────────────────────── crypto operations ────────────────────────

    /**
     * Get a signer callback. If `keyId` is provided the correct adapter is
     * resolved from the DB; otherwise the default adapter is used.
     */
    async signer(tenantId: string, keyId?: string): Promise<Signer> {
        if (keyId) {
            const adapter = await this.resolveAdapterForKey(tenantId, keyId);
            return adapter.signer(tenantId, keyId);
        }
        return this.kmsRegistry.getDefaultProvider().signer(tenantId, keyId);
    }

    /**
     * Get the first available key ID for a tenant.
     */
    async getKid(tenantId: string, usage: KeyUsage = "sign"): Promise<string> {
        const key = await this.keyRepository.findOneByOrFail({
            tenantId,
            usage,
        });
        return key.id;
    }

    /** Get the public key in JWK format. */
    getPublicKey(type: "jwk", tenantId: string, keyId?: string): Promise<JWK>;
    /** Get the public key in PEM format. */
    getPublicKey(
        type: "pem",
        tenantId: string,
        keyId?: string,
    ): Promise<string>;
    async getPublicKey(
        type: "pem" | "jwk",
        tenantId: string,
        keyId?: string,
    ): Promise<JWK | string> {
        if (keyId) {
            const adapter = await this.resolveAdapterForKey(tenantId, keyId);
            return adapter.getPublicKey(type as "jwk", tenantId, keyId);
        }
        return this.kmsRegistry
            .getDefaultProvider()
            .getPublicKey(type as "jwk", tenantId, keyId);
    }

    /**
     * Sign a JWT. Resolves the correct adapter from the key's kmsProvider.
     */
    async signJWT(
        payload: JWTPayload,
        header: JWSHeaderParameters,
        tenantId: string,
        keyId?: string,
    ): Promise<string> {
        if (keyId) {
            const adapter = await this.resolveAdapterForKey(tenantId, keyId);
            return adapter.signJWT(payload, header, tenantId, keyId);
        }
        return this.kmsRegistry
            .getDefaultProvider()
            .signJWT(payload, header, tenantId, keyId);
    }

    // ──────────────────────── metadata / CRUD ──────────────────────────

    /** List all signing keys for a tenant. */
    getKeys(tenantId: string): Promise<KeyEntity[]> {
        return this.keyRepository.findBy({ tenantId, usage: "sign" });
    }

    /** Get a single key with certificates. */
    getKey(tenantId: string, keyId: string): Promise<KeyEntity> {
        return this.keyRepository.findOneOrFail({
            where: { tenantId, id: keyId },
            relations: ["certificates"],
        });
    }

    /** Update key metadata (description, usage types, etc.). */
    async update(tenantId: string, id: string, body: UpdateKeyDto) {
        // Update basic fields (but exclude usageTypes which is handled separately)
        const { usageTypes, ...updateData } = body;
        await this.keyRepository.update({ tenantId, id }, updateData);

        // Update usage types if provided
        if (usageTypes !== undefined) {
            await this.saveKeyUsages(tenantId, id, usageTypes || []);
        }
    }

    /** Delete a key — delegates to the adapter so it can clean up KMS resources. */
    async deleteKey(tenantId: string, keyId: string): Promise<void> {
        const adapter = await this.resolveAdapterForKey(tenantId, keyId);
        return adapter.deleteKey(tenantId, keyId);
    }

    // ───────────────────────── config import ───────────────────────────

    /**
     * Imports keys for a specific tenant from the file system.
     */
    async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<KeyImportDto>(
            tenantId,
            {
                subfolder: "keys",
                fileExtension: ".json",
                validationClass: KeyImportDto,
                resourceType: "key",
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    return plainToClass(KeyImportDto, payload);
                },
                checkExists: async (tid, data) => {
                    const keys = await this.getKeys(tid);
                    return keys.some(
                        (k) => k.key.x === data.key.x && k.key.y === data.key.y,
                    );
                },
                deleteExisting: async (tid, data) => {
                    const keys = await this.getKeys(tid);
                    const existingKey = keys.find(
                        (k) => k.key.x === data.key.x && k.key.y === data.key.y,
                    );
                    if (existingKey) {
                        await this.certRepository.delete({
                            id: existingKey.id,
                            tenantId: tid,
                        });
                    }
                },
                processItem: async (tid, config) => {
                    const tenantEntity =
                        await this.tenantRepository.findOneByOrFail({
                            id: tid,
                        });
                    await this.import(tenantEntity.id, config).catch((err) => {
                        this.logger.log(err.message);
                    });
                },
            },
        );
    }
}
