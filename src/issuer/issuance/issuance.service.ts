import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssuanceConfig } from './entities/issuance-config.entity';
import { CredentialConfigService } from '../credentials/credential-config/credential-config.service';
import { IssuanceDto } from './dto/issuance.dto';
import { CredentialConfig } from '../credentials/entities/credential.entity';
import { AuthenticationConfig } from './dto/authentication-config.dto';

/**
 * Service for managing issuance configurations.
 * It provides methods to get, store, and delete issuance configurations.
 */
@Injectable()
export class IssuanceService {
    /**
     * Constructor for IssuanceService.
     * @param issuanceConfigRepo
     * @param credentialsConfigService
     */
    constructor(
        @InjectRepository(IssuanceConfig)
        private issuanceConfigRepo: Repository<IssuanceConfig>,
        private credentialsConfigService: CredentialConfigService,
    ) {}

    /**
     * Returns the issuance configurations for this tenant.
     * @param tenantId
     * @returns
     */
    public async getIssuanceConfiguration(tenantId: string) {
        return this.issuanceConfigRepo.find({
            where: { tenantId },
            relations: ['credentialConfigs'],
            select: {
                id: true,
                tenantId: true,
                // Add other fields you want from IssuanceConfig
                credentialConfigs: {
                    id: true, // Only select the id from credentialConfigs
                },
            },
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
            relations: ['credentialConfigs'],
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
        for (const credentialConfigId of value.credentialConfigs) {
            const credential = await this.credentialsConfigService.getById(
                tenantId,
                credentialConfigId,
            );
            if (credential) {
                credentials.push(credential);
            }
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

        const issuanceConfig = this.issuanceConfigRepo.create({
            ...value,
            tenantId,
            credentialConfigs: credentials,
            authenticationConfig,
        });
        return this.issuanceConfigRepo.save(issuanceConfig);
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
