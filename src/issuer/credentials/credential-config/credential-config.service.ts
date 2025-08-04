import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialConfig } from '../entities/credential.entity';
import { ConfigService } from '@nestjs/config';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { PinoLogger } from 'nestjs-pino';

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
        private configService: ConfigService,
        private logger: PinoLogger,
    ) {}

    /**
     * Imports the configs
     */
    public async import() {
        const configPath = this.configService.getOrThrow('CONFIG_FOLDER');
        const subfolder = 'issuance/credentials';
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
                    const exists = await this.getById(
                        tenant.name,
                        payload.id,
                    ).catch(() => false);
                    if (exists && !force) {
                        continue; // Skip if config already exists and force is not set
                    }

                    // Validate the payload against CredentialConfig
                    const config = plainToClass(CredentialConfig, payload);
                    const validationErrors = await validate(config);

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
                            `Validation failed for credentials config ${file} in tenant ${tenant.name}`,
                        );
                        continue; // Skip this invalid config
                    }

                    await this.store(tenant.name, config);
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
    store(tenantId: string, config: CredentialConfig) {
        return this.credentialConfigRepository.save({
            ...config,
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
