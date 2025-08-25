import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { readdirSync, readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import { join } from "path";
import { Repository } from "typeorm";
import { CryptoService } from "../../crypto/crypto.service";
import { CredentialConfigService } from "../credentials/credential-config/credential-config.service";
import { CredentialConfig } from "../credentials/entities/credential.entity";
import { IssuanceDto } from "./dto/issuance.dto";
import { IssuanceConfig } from "./entities/issuance-config.entity";

/**
 * Service for managing issuance configurations.
 * It provides methods to get, store, and delete issuance configurations.
 */
@Injectable()
export class IssuanceService implements OnModuleInit {
    /**
     * Constructor for IssuanceService.
     * @param issuanceConfigRepo
     * @param credentialsConfigService
     */
    constructor(
        @InjectRepository(IssuanceConfig)
        private issuanceConfigRepo: Repository<IssuanceConfig>,
        private credentialsConfigService: CredentialConfigService,
        private configService: ConfigService,
        private logger: PinoLogger,
        private cryptoService: CryptoService,
    ) {}

    /**
     * Import issuance configurations and the credential configurations from the configured folder.
     */
    async onModuleInit() {
        await this.cryptoService.import();
        await this.credentialsConfigService.import();
        await this.import();
    }

    /**
     * Import issuance configurations from the configured folder.
     */
    private async import() {
        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
        const subfolder = "issuance/issuance";
        const force = this.configService.get<boolean>("CONFIG_IMPORT_FORCE");
        if (this.configService.get<boolean>("CONFIG_IMPORT")) {
            const tenantFolders = readdirSync(configPath, {
                withFileTypes: true,
            }).filter((tenant) => tenant.isDirectory());
            for (const tenant of tenantFolders) {
                let counter = 0;
                //iterate over all elements in the folder and import them
                const path = join(configPath, tenant.name, subfolder);
                const files = readdirSync(path);
                for (const file of files) {
                    const payload = JSON.parse(
                        readFileSync(join(path, file), "utf8"),
                    );

                    payload.id = file.replace(".json", "");
                    const exists = await this.getIssuanceConfigurationById(
                        payload.id,
                        tenant.name,
                    ).catch(() => false);
                    if (exists && !force) {
                        continue; // Skip if config already exists and force is not set.
                    }

                    // Validate the payload against IssuanceDto
                    const issuanceDto = plainToClass(IssuanceDto, payload);
                    //TOODO: it does not validate the different config options
                    const validationErrors = await validate(issuanceDto, {
                        whitelist: true,
                        forbidUnknownValues: false, // avoid false positives on plain objects
                        forbidNonWhitelisted: false,
                        stopAtFirstError: false,
                    });

                    if (validationErrors.length > 0) {
                        const extractErrorMessages = (error: any): string[] => {
                            const messages: string[] = [];

                            // Add constraints from the current level
                            if (error.constraints) {
                                messages.push(
                                    ...Object.values(
                                        error.constraints as Record<
                                            string,
                                            string
                                        >,
                                    ),
                                );
                            }

                            // Recursively add constraints from children
                            if (error.children && error.children.length > 0) {
                                for (const child of error.children) {
                                    messages.push(
                                        ...extractErrorMessages(child),
                                    );
                                }
                            }

                            return messages;
                        };

                        const errorMessages = validationErrors
                            .map((error) => {
                                const messages = extractErrorMessages(error);
                                return messages.length > 0
                                    ? `${error.property}: ${messages.join(", ")}`
                                    : error.property;
                            })
                            .join("; ");

                        this.logger.error(
                            {
                                event: "ValidationError",
                                file,
                                tenant: tenant.name,
                                errors: validationErrors.map((error) => ({
                                    property: error.property,
                                    constraints: error.constraints,
                                    value: error.value,
                                })),
                            },
                            `Validation failed for issuance config ${file} in tenant ${tenant.name}: ${errorMessages}`,
                        );
                        continue; // Skip this invalid config
                    }
                    await this.storeIssuanceConfiguration(
                        tenant.name,
                        issuanceDto,
                    );
                    counter++;
                }
                this.logger.info(
                    {
                        event: "Import",
                    },
                    `${counter} issuance configs imported for ${tenant.name}`,
                );
            }
        }
    }

    async onTenantDelete(tenantId: string) {
        await this.issuanceConfigRepo.delete({ tenantId });
    }

    /**
     * Returns the issuance configurations for this tenant.
     * @param tenantId
     * @returns
     */
    public getIssuanceConfiguration(tenantId: string) {
        return this.issuanceConfigRepo.find({
            where: { tenantId },
            relations: ["credentialConfigs"],
        });
    }

    /**
     * Returns the issuance configuration by ID for a given tenant.
     * @param issuanceConfigId
     * @param tenantId
     * @returns
     */
    getIssuanceConfigurationById(
        issuanceConfigId: string,
        tenantId: string,
    ): Promise<IssuanceConfig> {
        return this.issuanceConfigRepo.findOneOrFail({
            where: { id: issuanceConfigId, tenantId },
            relations: ["credentialConfigs"],
        });
    }

    /**
     * Store the config. If it already exist, overwrite it.
     * @param tenantId
     * @param value
     * @returns
     */
    async storeIssuanceConfiguration(tenantId: string, value: IssuanceDto) {
        const credentials: CredentialConfig[] = [];
        //check if all credential configs exist
        for (const credentialConfigId of value.credentialConfigIds) {
            const credential = await this.credentialsConfigService.getById(
                tenantId,
                credentialConfigId,
            );
            credentials.push(credential);
        }
        const issuanceConfig = await this.issuanceConfigRepo.save({
            ...value,
            tenantId,
            credentialConfigs: credentials,
        });
        return issuanceConfig;
    }

    /**
     * Deletes a credential configuration.
     * @param tenantId
     * @param id
     * @returns
     */
    deleteIssuanceConfiguration(tenantId: string, id: string) {
        return this.issuanceConfigRepo.delete({ tenantId, id });
    }
}
