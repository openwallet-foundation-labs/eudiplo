import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CredentialConfig } from '../entities/credential.entity';

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
    ) {}

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
        return this.credentialConfigRepository.findOne({
            where: { id, tenantId },
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
