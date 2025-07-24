import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IssuanceConfig } from './entities/issuance-config.entity';
import { CredentialConfigService } from '../credentials/credential-config/credential-config.service';
import { IssuanceDto } from './dto/issuance.dto';
import { CredentialConfig } from '../credentials/entities/credential.entity';

@Injectable()
export class IssuanceService {
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
        const issuanceConfig = this.issuanceConfigRepo.create({
            ...value,
            tenantId,
            credentialConfigs: credentials,
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
