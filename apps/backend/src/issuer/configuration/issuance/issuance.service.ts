import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import { Repository } from "typeorm";
import { CertService } from "../../../crypto/key/cert/cert.service";
import { KeyService } from "../../../crypto/key/key.service";
import { ConfigImportService } from "../../../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../../../shared/utils/config-import/config-import-orchestrator.service";
import { FilesService } from "../../../storage/files.service";
import { StatusListService } from "../../lifecycle/status/status-list.service";
import { CredentialConfigService } from "../credentials/credential-config/credential-config.service";
import { DisplayInfo } from "./dto/display.dto";
import { IssuanceDto } from "./dto/issuance.dto";
import { IssuanceConfig } from "./entities/issuance-config.entity";

/**
 * Service for managing issuance configurations.
 * It provides methods to get, store, and delete issuance configurations.
 */
@Injectable()
export class IssuanceService implements OnApplicationBootstrap {
    /**
     * Constructor for IssuanceService.
     * @param issuanceConfigRepo
     * @param credentialsConfigService
     */
    constructor(
        @InjectRepository(IssuanceConfig)
        private readonly issuanceConfigRepo: Repository<IssuanceConfig>,
        private readonly credentialsConfigService: CredentialConfigService,
        private readonly statusListService: StatusListService,
        private readonly logger: PinoLogger,
        private readonly filesService: FilesService,
        private readonly configImportService: ConfigImportService,
        private readonly configImportOrchestrator: ConfigImportOrchestratorService,
        private readonly certService: CertService,
        @Inject("KeyService") public readonly keyService: KeyService,
    ) {
        // Register imports with the orchestrator in the correct order
        this.configImportOrchestrator.register("keys", ImportPhase.CORE, () =>
            this.keyService.importKeys(),
        );
        this.configImportOrchestrator.register(
            "certificates",
            ImportPhase.CORE,
            () => this.certService.importCerts(),
        );
        this.configImportOrchestrator.register(
            "issuance",
            ImportPhase.CONFIGURATION,
            () => this.import(),
        );
        this.configImportOrchestrator.register(
            "credentials",
            ImportPhase.CONFIGURATION,
            () => this.credentialsConfigService.import(),
        );
        this.configImportOrchestrator.register(
            "status-lists",
            ImportPhase.FINAL,
            () => this.statusListService.import(),
        );
    }

    /**
     * Import issuance configurations and the credential configurations from the configured folder.
     */
    async onApplicationBootstrap() {
        await this.configImportOrchestrator.runImports();
    }

    /**
     * Import issuance configurations from the configured folder.
     */
    private async import() {
        await this.configImportService.importConfigs<IssuanceDto>({
            subfolder: "issuance",
            fileExtension: ".json",
            validationClass: IssuanceDto,
            resourceType: "issuance config",
            formatValidationError: (error) =>
                this.configImportService.formatNestedValidationError(error),
            checkExists: (tenantId) => {
                return this.getIssuanceConfiguration(tenantId)
                    .then(() => true)
                    .catch(() => false);
            },
            deleteExisting: (tenantId) =>
                this.issuanceConfigRepo
                    .delete({ tenantId })
                    .then(() => undefined),
            loadData: (filePath) => {
                const payload = JSON.parse(readFileSync(filePath, "utf8"));
                return plainToClass(IssuanceDto, payload);
            },
            processItem: async (tenantId, issuanceDto) => {
                // Replace relative URIs with public URLs
                issuanceDto.display = await this.replaceUrl(
                    issuanceDto.display,
                    tenantId,
                );

                await this.storeIssuanceConfiguration(tenantId, issuanceDto);
            },
        });
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
                        this.logger.error(
                            {
                                event: "Import",
                            },
                            `Could not find logo ${display.logo.uri} for ${tenantId}, skipping import`,
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
