import { readFileSync } from "node:fs";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { Repository } from "typeorm";
import { CertService } from "../../../../crypto/key/cert/cert.service";
import { CertUsage } from "../../../../crypto/key/entities/cert-usage.entity";
import { ConfigImportService } from "../../../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../../../shared/utils/config-import/config-import-orchestrator.service";
import { FilesService } from "../../../../storage/files.service";
import { PresentationsService } from "../../../../verifier/presentations/presentations.service";
import { CredentialConfigCreate } from "../dto/credential-config-create.dto";
import { CredentialConfigUpdate } from "../dto/credential-config-update.dto";
import { CredentialConfig } from "../entities/credential.entity";
import { IaeActionType } from "../entities/iae-action.dto";

/**
 * Service for managing credential configurations.
 */
@Injectable()
export class CredentialConfigService {
    private readonly logger = new Logger(CredentialConfigService.name);

    /**
     * Constructor for CredentialConfigService.
     * @param credentialConfigRepository - Repository for CredentialConfig entity.
     */
    constructor(
        @InjectRepository(CredentialConfig)
        private readonly credentialConfigRepository: Repository<CredentialConfig>,
        private readonly certService: CertService,
        private readonly filesService: FilesService,
        private readonly configImportService: ConfigImportService,
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
        private readonly presentationsService: PresentationsService,
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
     * Note: IAE action validation is skipped during import because
     * presentation configs are imported in a later phase (REFERENCES).
     */
    private async processCredentialConfig(
        tenantId: string,
        config: CredentialConfigCreate,
    ) {
        // Replace image references with actual URLs
        await this.replaceImageReferences(tenantId, config);

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

        // Skip IAE validation during import - presentation configs are imported later
        await this.store(tenantId, config, true);
    }

    /**
     * Replaces a single image reference with a public URL, or returns undefined if invalid.
     */
    private async resolveImageUrl(
        tenantId: string,
        image: { uri?: string } | undefined,
        context: string,
    ): Promise<{ uri: string } | undefined> {
        if (!image?.uri) {
            return undefined;
        }
        const url = await this.filesService.replaceUriWithPublicUrl(
            tenantId,
            image.uri,
        );
        if (url) {
            return { uri: url };
        }
        this.logger.warn(
            `[${tenantId}] Could not find image ${image.uri} for ${context}`,
        );
        return undefined;
    }

    /**
     * Replaces image references (logo, background_image) with actual public URLs.
     * This is used both during file import and API calls.
     * @param tenantId - The ID of the tenant.
     * @param config - The credential config to process.
     */
    private async replaceImageReferences(
        tenantId: string,
        config: CredentialConfigCreate | CredentialConfigUpdate,
    ): Promise<void> {
        if (!config.config?.display) {
            return;
        }

        config.config.display = await Promise.all(
            config.config.display.map(async (display) => {
                display.background_image = await this.resolveImageUrl(
                    tenantId,
                    display.background_image,
                    "credentials config background_image",
                );
                display.logo = await this.resolveImageUrl(
                    tenantId,
                    display.logo,
                    "credentials config logo",
                );
                return display;
            }),
        );
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
     * Validates IAE actions in a credential configuration.
     * Checks that all referenced presentation configs exist.
     * @param tenantId - The ID of the tenant.
     * @param config - The credential config to validate.
     * @throws BadRequestException if a referenced presentation config doesn't exist.
     */
    private async validateIaeActions(
        tenantId: string,
        config: CredentialConfigCreate | CredentialConfigUpdate,
    ): Promise<void> {
        if (!config.iaeActions?.length) {
            return;
        }

        for (const action of config.iaeActions) {
            if (action.type === IaeActionType.OPENID4VP_PRESENTATION) {
                const presentationConfigId = (
                    action as { presentationConfigId: string }
                ).presentationConfigId;

                try {
                    await this.presentationsService.getPresentationConfig(
                        presentationConfigId,
                        tenantId,
                    );
                } catch {
                    throw new BadRequestException(
                        `IAE action references presentation config '${presentationConfigId}' which does not exist`,
                    );
                }
            }
        }
    }

    /**
     * Stores a credential configuration for a given tenant.
     * If the configuration already exists, it will be overwritten.
     * Automatically replaces image references with public URLs.
     * Validates IAE action references.
     * @param tenantId - The ID of the tenant.
     * @param config - The CredentialConfig entity to store.
     * @param skipValidation - Skip IAE action validation (used during file imports).
     * @returns A promise that resolves to the stored CredentialConfig entity.
     */
    async store(
        tenantId: string,
        config: CredentialConfigCreate,
        skipValidation = false,
    ) {
        await this.replaceImageReferences(tenantId, config);
        if (!skipValidation) {
            await this.validateIaeActions(tenantId, config);
        }
        return this.credentialConfigRepository.save({
            ...config,
            tenantId,
        });
    }

    /**
     * Updates a credential configuration for a given tenant.
     * Only updates fields that are provided in the config.
     * Set fields to null to clear them.
     * Automatically replaces image references with public URLs.
     * Validates IAE action references.
     * @param tenantId - The ID of the tenant.
     * @param id - The ID of the CredentialConfig entity to update.
     * @param config - The partial CredentialConfig to update.
     * @returns A promise that resolves to the updated CredentialConfig entity.
     */
    async update(tenantId: string, id: string, config: CredentialConfigUpdate) {
        await this.replaceImageReferences(tenantId, config);
        await this.validateIaeActions(tenantId, config);
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
