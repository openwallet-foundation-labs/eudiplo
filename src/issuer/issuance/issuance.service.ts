import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssuanceConfig } from './entities/issuance-config.entity';
import { CredentialConfigService } from '../credentials/credential-config/credential-config.service';
import { IssuanceDto } from './dto/issuance.dto';
import { AuthenticationConfig } from './dto/authentication-config.dto';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { readdirSync, readFileSync } from 'fs';
import { PinoLogger } from 'nestjs-pino';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { CredentialIssuanceBinding } from './entities/credential-issuance-binding.entity';
import { CredentialConfig } from '../credentials/entities/credential.entity';

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
        @InjectRepository(CredentialIssuanceBinding)
        private credentialIssuanceBindingRepo: Repository<CredentialIssuanceBinding>,
        private credentialsConfigService: CredentialConfigService,
        private configService: ConfigService,
        private logger: PinoLogger,
    ) {}

    async onModuleInit() {
        await this.credentialsConfigService.import();
        await this.import();
    }

    private async import() {
        const configPath = this.configService.getOrThrow('CONFIG_FOLDER');
        const subfolder = 'issuance/issuance';
        const force = this.configService.get<boolean>('CONFIG_IMPORT_FORCE');
        if (this.configService.get<boolean>('CONFIG_IMPORT')) {
            const tenantFolders = readdirSync(configPath, {
                withFileTypes: true,
            }).filter((tenant) => tenant.isDirectory());
            let counter = 0;
            for (const tenant of tenantFolders) {
                //iterate over all elements in the folder and import them
                const path = join(configPath, tenant.name, subfolder);
                const files = readdirSync(path);
                for (const file of files) {
                    const payload = JSON.parse(
                        readFileSync(join(path, file), 'utf8'),
                    );

                    payload.id = file.replace('.json', '');
                    const exists = await this.getIssuanceConfigurationById(
                        payload.id,
                        tenant.name,
                    ).catch(() => false);
                    if (exists && !force) {
                        continue; // Skip if config already exists and force is not set
                    }

                    // Validate the payload against IssuanceDto
                    const issuanceDto = plainToClass(IssuanceDto, payload);
                    const validationErrors = await validate(issuanceDto);

                    if (validationErrors.length > 0) {
                        this.logger.error(
                            {
                                event: 'ValidationError',
                                file,
                                tenant: tenant.name,
                                errors: validationErrors.map((error) => ({
                                    property: error.property,
                                    constraints: error.constraints,
                                    value: error.value,
                                })),
                            },
                            `Validation failed for issuance config ${file} in tenant ${tenant.name}`,
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
                        event: 'Import',
                    },
                    `${counter} issuance configs imported for ${tenant.name}`,
                );
            }
        }
    }

    /**
     * Returns the issuance configurations for this tenant.
     * @param tenantId
     * @returns
     */
    public async getIssuanceConfiguration(tenantId: string) {
        return this.issuanceConfigRepo.find({
            where: { tenantId },
        });
    }

    /**
     * Returns the issuance configuration by ID for a given tenant.
     * @param issuanceConfigId
     * @param tenantId
     * @returns
     */
    async getIssuanceConfigurationById(
        issuanceConfigId: string,
        tenantId: string,
    ): Promise<IssuanceConfig> {
        return this.issuanceConfigRepo.findOneOrFail({
            where: { id: issuanceConfigId, tenantId },
            relations: ['credentialIssuanceBindings'],
        });
    }

    /**
     * Store the config. If it already exist, overwrite it.
     * @param tenantId
     * @param value
     * @returns
     */
    async storeIssuanceConfiguration(tenantId: string, value: IssuanceDto) {
        const credentials: { config: CredentialConfig; keyId?: string }[] = [];
        //check if all credential configs exist
        for (const credentialConfigId of value.credentialConfigs) {
            const credential = await this.credentialsConfigService.getById(
                tenantId,
                credentialConfigId.id,
            );
            credentials.push({
                config: credential,
                keyId: credentialConfigId.keyId,
            });
        }

        // Convert AuthenticationConfigDto to AuthenticationConfig union type
        let authenticationConfig: AuthenticationConfig;
        if (value.authenticationConfig.method === 'none') {
            authenticationConfig = { method: 'none' };
        } else if (value.authenticationConfig.method === 'auth') {
            if (!value.authenticationConfig.config) {
                throw new Error(
                    'AuthenticationConfig is required for auth method',
                );
            }
            authenticationConfig = {
                method: 'auth',
                config: value.authenticationConfig.config as any,
            };
        } else if (
            value.authenticationConfig.method === 'presentationDuringIssuance'
        ) {
            if (!value.authenticationConfig.config) {
                throw new Error(
                    'AuthenticationConfig is required for presentationDuringIssuance method',
                );
            }
            authenticationConfig = {
                method: 'presentationDuringIssuance',
                config: value.authenticationConfig.config as any,
            };
        } else {
            throw new Error(
                `Invalid authentication method: ${(value.authenticationConfig as any).method}`,
            );
        }

        const issuanceConfig = await this.issuanceConfigRepo.save({
            ...value,
            tenantId,
            authenticationConfig,
        });

        //store the binding between credential and isuance
        for (const credentialConfig of credentials) {
            await this.credentialIssuanceBindingRepo.save({
                credentialConfig: credentialConfig.config,
                issuanceConfig,
                keyID: credentialConfig.keyId,
            });
        }
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
