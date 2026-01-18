import { readFileSync } from "node:fs";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { CertService } from "../../../../crypto/key/cert/cert.service";
import { CertUsage } from "../../../../crypto/key/entities/cert-usage.entity";
import { ConfigImportService } from "../../../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../../../shared/utils/config-import/config-import-orchestrator.service";
import { FilesService } from "../../../../storage/files.service";
import { StatusListService } from "../../../lifecycle/status/status-list.service";
import { CredentialConfigCreate } from "../dto/credential-config-create.dto";
import { CredentialConfigUpdate } from "../dto/credential-config-update.dto";
import { CredentialConfig } from "../entities/credential.entity";

/**
 * Service for managing credential configurations.
 */
@Injectable()
export class CredentialConfigService {
    /**
     * Constructor for CredentialConfigService.
     * @param credentialConfigRepository - Repository for CredentialConfig entity.
     */
    constructor(
        @InjectRepository(CredentialConfig)
        private readonly credentialConfigRepository: Repository<CredentialConfig>,
        private readonly logger: PinoLogger,
        private readonly certService: CertService,
        private readonly filesService: FilesService,
        private readonly configImportService: ConfigImportService,
        private readonly statusListService: StatusListService,
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
    ) {
        this.configImportOrchestrator.register(
            "credentials",
            ImportPhase.CONFIGURATION,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    /**
     * Imports credential configs for a specific tenant.
     */
    public async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<CredentialConfigCreate>(
            tenantId,
            {
                subfolder: "issuance/credentials",
                fileExtension: ".json",
                validationClass: CredentialConfigCreate,
                resourceType: "credential config",
                checkExists: (tid, data) =>
                    this.getById(tid, data.id)
                        .then(() => true)
                        .catch(() => false),
                deleteExisting: (tid, data) =>
                    this.credentialConfigRepository
                        .delete({
                            id: data.id,
                            tenantId: tid,
                        })
                        .then(() => undefined),
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    return plainToClass(CredentialConfigCreate, payload);
                },
                processItem: async (tid, config) => {
                    await this.processCredentialConfig(tid, config);
                },
            },
        );
    }

    /**
     * Process a credential config for import.
     */
    private async processCredentialConfig(
        tenantId: string,
        config: CredentialConfigCreate,
    ) {
        // Replace image references with actual URLs
        config.config.display = await Promise.all(
            config.config.display.map(async (display) => {
                if (display.background_image?.uri) {
                    const url = await this.filesService.replaceUriWithPublicUrl(
                        tenantId,
                        display.background_image.uri,
                    );
                    if (url) {
                        display.background_image.uri = url;
                    } else {
                        this.logger.warn(
                            `[${tenantId}] Could not find image ${display.background_image.uri} for credentials config`,
                        );
                    }
                }
                if (display.logo?.uri) {
                    const url = await this.filesService.replaceUriWithPublicUrl(
                        tenantId,
                        display.logo.uri,
                    );
                    if (url) {
                        display.logo.uri = url;
                    } else {
                        this.logger.warn(
                            `[${tenantId}] Could not find image ${display.logo.uri} for credentials config`,
                        );
                    }
                }
                return display;
            }),
        );

        // Check if cetId is provided and if the certificate exists.
        if (config.certId) {
            const cert = await this.certService.find({
                tenantId,
                type: CertUsage.Signing,
                id: config.certId,
            });
            if (!cert) {
                throw new Error(
                    `Cert ID ${config.certId} must be defined in the crypto service`,
                );
            }
            (config as CredentialConfig).cert = cert;
        }

        //check if status revocation is enabled and if yes, ensure a status list is available
        if (config.statusManagement) {
            const hasEntries = await this.statusListService.hasStillFreeEntries(
                tenantId,
                config.id,
            );
            if (!hasEntries) {
                // Create a new shared list if no available list exists
                await this.statusListService.createNewList(tenantId);
            }
        }

        await this.store(tenantId, config);
    }

    /**
     * Retrieves all credential configurations for a given tenant.
     * @param tenantId - The ID of the tenant.
     * @returns A promise that resolves to an array of CredentialConfig entities.
     */
    get(tenantId: string) {
        return this.credentialConfigRepository.find({
            where: { tenantId },
        });
    }

    /**
     * Retrieves a credential configuration by its ID for a given tenant.
     * @param tenantId
     * @param id
     * @returns
     */
    getById(tenantId: string, id: string) {
        return this.credentialConfigRepository.findOneByOrFail({
            id,
            tenantId,
        });
    }

    /**
     * Stores a credential configuration for a given tenant.
     * If the configuration already exists, it will be overwritten.
     * @param tenantId - The ID of the tenant.
     * @param config - The CredentialConfig entity to store.
     * @returns A promise that resolves to the stored CredentialConfig entity.
     */
    store(tenantId: string, config: CredentialConfigCreate) {
        return this.credentialConfigRepository.save({
            ...config,
            tenantId,
        });
    }

    /**
     * Updates a credential configuration for a given tenant.
     * Only updates fields that are provided in the config.
     * Set fields to null to clear them.
     * @param tenantId - The ID of the tenant.
     * @param id - The ID of the CredentialConfig entity to update.
     * @param config - The partial CredentialConfig to update.
     * @returns A promise that resolves to the updated CredentialConfig entity.
     */
    async update(tenantId: string, id: string, config: CredentialConfigUpdate) {
        const existing = await this.getById(tenantId, id);
        return this.credentialConfigRepository.save({
            ...existing,
            ...config,
            id,
            tenantId,
        });
    }

    /**
     * Deletes a credential configuration for a given tenant.
     * @param tenantId - The ID of the tenant.
     * @param id - The ID of the CredentialConfig entity to delete.
     * @returns A promise that resolves to the result of the delete operation.
     */
    delete(tenantId: string, id: string) {
        return this.credentialConfigRepository.delete({
            id,
            tenantId,
        });
    }
}
