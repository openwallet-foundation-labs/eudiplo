import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { readdirSync, readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import { join } from "path";
import { Repository } from "typeorm";
import { CryptoService } from "../../crypto/crypto.service";
import { FilesService } from "../../storage/files.service";
import { CredentialConfigService } from "../credentials/credential-config/credential-config.service";
import { DisplayInfo } from "../display/dto/display.dto";
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
        private issuanceConfigRepo: Repository<IssuanceConfig>,
        private credentialsConfigService: CredentialConfigService,
        private configService: ConfigService,
        private logger: PinoLogger,
        private cryptoService: CryptoService,
        private filesService: FilesService,
    ) {}

    /**
     * Import issuance configurations and the credential configurations from the configured folder.
     */
    async onApplicationBootstrap() {
        await this.cryptoService.import();
        // import first the issuance config to make sure it exists when credentials should be imported
        await this.import();
        await this.credentialsConfigService.import();
    }

    /**
     * Import issuance configurations from the configured folder.
     */
    private async import() {
        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
        const configFile = "issuance/issuance.json";
        const force = this.configService.get<boolean>("CONFIG_IMPORT_FORCE");
        if (this.configService.get<boolean>("CONFIG_IMPORT")) {
            const tenantFolders = readdirSync(configPath, {
                withFileTypes: true,
            }).filter((tenant) => tenant.isDirectory());
            for (const tenant of tenantFolders) {
                //iterate over all elements in the folder and import them
                const file = join(configPath, tenant.name, configFile);

                const payload = JSON.parse(readFileSync(file, "utf8"));

                const exists = await this.getIssuanceConfiguration(
                    tenant.name,
                ).catch(() => false);
                if (exists && !force) {
                    continue; // Skip if config already exists and force is not set.
                } else if (exists && force) {
                    //delete old element so removed elements are not present
                    await this.issuanceConfigRepo.delete({
                        tenantId: tenant.name,
                    });
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
                                    error.constraints as Record<string, string>,
                                ),
                            );
                        }

                        // Recursively add constraints from children
                        if (error.children && error.children.length > 0) {
                            for (const child of error.children) {
                                messages.push(...extractErrorMessages(child));
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

                //replace relative uris with public urls
                issuanceDto.display = await this.replaceUrl(
                    issuanceDto.display,
                    tenant.name,
                );

                await this.storeIssuanceConfiguration(tenant.name, issuanceDto);

                this.logger.info(
                    {
                        event: "Import",
                    },
                    `issuance config imported for ${tenant.name}`,
                );
            }
        }
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
                    } else {
                        display.logo.uri = uri;
                    }
                    delete display.logo;
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
