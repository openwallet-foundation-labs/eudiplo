import { readFileSync } from "node:fs";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { Repository } from "typeorm";
import { KeyService } from "../../../crypto/key/key.service";
import { ConfigImportService } from "../../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../../shared/utils/config-import/config-import-orchestrator.service";
import { FilesService } from "../../../storage/files.service";
import { DisplayInfo } from "./dto/display.dto";
import { IssuanceDto } from "./dto/issuance.dto";
import { IssuanceConfig } from "./entities/issuance-config.entity";

/**
 * Service for managing issuance configurations.
 * It provides methods to get, store, and delete issuance configurations.
 */
@Injectable()
export class IssuanceService {
    private readonly logger = new Logger(IssuanceService.name);

    /**
     * Constructor for IssuanceService.
     * @param issuanceConfigRepo
     * @param credentialsConfigService
     */
    constructor(
        @InjectRepository(IssuanceConfig)
        private readonly issuanceConfigRepo: Repository<IssuanceConfig>,
        private readonly filesService: FilesService,
        private readonly configImportService: ConfigImportService,
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
        @Inject("KeyService") public readonly keyService: KeyService,
    ) {
        this.configImportOrchestrator.register(
            "issuance",
            ImportPhase.CONFIGURATION,
            (tenantId) => this.importForTenant(tenantId),
        );
    }

    /**
     * Import issuance configurations for a specific tenant.
     */
    private async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<IssuanceDto>(
            tenantId,
            {
                subfolder: "issuance",
                fileExtension: ".json",
                validationClass: IssuanceDto,
                resourceType: "issuance config",
                formatValidationError: (error) =>
                    this.configImportService.formatNestedValidationError(error),
                checkExists: (tid) => {
                    return this.getIssuanceConfiguration(tid)
                        .then(() => true)
                        .catch(() => false);
                },
                deleteExisting: (tid) =>
                    this.issuanceConfigRepo
                        .delete({ tenantId: tid })
                        .then(() => undefined),
                loadData: (filePath) => {
                    const payload = JSON.parse(readFileSync(filePath, "utf8"));
                    return plainToClass(IssuanceDto, payload);
                },
                processItem: async (tid, issuanceDto) => {
                    // Replace relative URIs with public URLs
                    issuanceDto.display = await this.replaceUrl(
                        issuanceDto.display,
                        tid,
                    );

                    await this.storeIssuanceConfiguration(tid, issuanceDto);
                },
            },
        );
    }

    private replaceUrl(display: DisplayInfo[], tenantId: string) {
        return Promise.all(
            display.map(async (display) => {
                if (display.logo?.uri) {
                    const uri = await this.filesService.replaceUriWithPublicUrl(
                        tenantId,
                        display.logo.uri.trim(),
                    );
                    if (!uri) {
                        this.logger.warn(
                            `[${tenantId}] Could not find logo ${display.logo.uri}, skipping`,
                        );
                        delete display.logo;
                    } else {
                        display.logo.uri = uri;
                    }
                }
                return display;
            }),
        );
    }

    /**
     * Returns the issuance configuration for this tenant. If not found, creates a default one.
     * @param tenantId
     * @returns
     */
    public getIssuanceConfiguration(tenantId: string) {
        return this.issuanceConfigRepo
            .findOneByOrFail({ tenantId })
            .catch(() => {
                const defaultConfig = this.issuanceConfigRepo.create({
                    tenantId,
                });
                return this.issuanceConfigRepo.save(defaultConfig);
            });
    }

    /**
     * Store the config. If it already exist, overwrite it.
     * @param tenantId
     * @param value
     * @returns
     */
    async storeIssuanceConfiguration(tenantId: string, value: IssuanceDto) {
        value.display = await this.replaceUrl(value.display, tenantId);
        return this.issuanceConfigRepo.save({
            ...value,
            tenantId,
        });
    }
}
