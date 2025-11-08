import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { readdirSync, readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import { join } from "path";
import { Repository } from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { FilesService } from "../../storage/files.service";
import { DisplayCreateDto } from "./dto/display-create.dto";
import { DisplayEntity } from "./entities/display.entity";

/**
 * Display Service
 */
@Injectable()
export class DisplayService implements OnApplicationBootstrap {
    /**
     * Display Service
     * @param displayRepository
     */
    constructor(
        @InjectRepository(DisplayEntity)
        private readonly displayRepository: Repository<DisplayEntity>,
        private readonly configService: ConfigService,
        private logger: PinoLogger,
        private filesService: FilesService,
    ) {}

    /**
     * On application bootstrap, import display information
     */
    onApplicationBootstrap() {
        this.import();
    }

    /**
     * Initialize the OID4VCI issuer and resource server.
     * @param tenantId The ID of the tenant.
     * @returns The initialized OID4VCI issuer and resource server.
     */
    onTenantInit(tenant: TenantEntity) {
        const entry = this.displayRepository.create({
            tenant,
            value: [
                {
                    name: tenant.name,
                    //TODO: should another default locale be used?
                    locale: "en-US",
                },
            ],
        });
        return this.displayRepository.save(entry);
    }

    /**
     * Import display information from the config folder
     */
    async import() {
        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
        const subfolder = "issuance/display.json";
        const force = this.configService.get<boolean>("CONFIG_IMPORT_FORCE");
        if (this.configService.get<boolean>("CONFIG_IMPORT")) {
            const tenantFolders = readdirSync(configPath, {
                withFileTypes: true,
            }).filter((tenant) => tenant.isDirectory());
            for (const tenant of tenantFolders) {
                //iterate over all elements in the folder and import them
                const path = join(configPath, tenant.name, subfolder);
                const file = readFileSync(path);
                if (!file) {
                    continue;
                }
                const payload = JSON.parse(file.toString());

                // Validate the payload against DisplayCreateDto
                const config = plainToClass(DisplayCreateDto, payload);
                const validationErrors = await validate(config, {
                    whitelist: true,
                    forbidUnknownValues: false, // avoid false positives on plain objects
                    forbidNonWhitelisted: false,
                    stopAtFirstError: false,
                });
                if (validationErrors.length > 0) {
                    this.logger.error(
                        {
                            event: "Import",
                            errors: validationErrors,
                        },
                        `Invalid display configuration for ${tenant.name}, skipping import`,
                    );
                    continue;
                }

                //replace relative uris with public urls
                config.value = await Promise.all(
                    config.value.map(async (display) => {
                        if (display.logo?.uri) {
                            const uri =
                                await this.filesService.replaceUriWithPublicUrl(
                                    tenant.name,
                                    display.logo.uri.trim(),
                                );
                            if (!uri) {
                                this.logger.error(
                                    {
                                        event: "Import",
                                    },
                                    `Could not find logo ${display.logo.uri} for ${tenant.name}, skipping import`,
                                );
                            } else {
                                display.logo.uri = uri;
                            }
                        }
                        return display;
                    }),
                );

                //check if already exists
                const exists = await this.displayRepository.findOneBy({
                    tenantId: tenant.name,
                });
                if (exists && !force) continue;

                await this.displayRepository.save({
                    ...config,
                    tenantId: tenant.name,
                });

                this.logger.info(
                    {
                        event: "Import",
                    },
                    `imported display info for ${tenant.name}`,
                );
            }
        }
    }

    /**
     * Get display information for a user
     * @param tenantId The ID of the tenant
     * @returns The display information for the tenant
     */
    get(tenantId: string): Promise<DisplayEntity | null> {
        return this.displayRepository.findOne({
            where: { tenantId },
        });
    }

    /**
     * Create a new display for a user
     * @param tenantId The ID of the tenant
     * @param displayData The display data to create
     * @returns The created display information
     */
    create(
        tenantId: string,
        displayData: DisplayCreateDto,
    ): Promise<DisplayEntity> {
        const displayEntity = this.displayRepository.create({
            ...displayData,
            tenantId,
        });
        return this.displayRepository.save(displayEntity);
    }
}
