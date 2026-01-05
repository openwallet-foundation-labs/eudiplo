import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { BitsPerStatus } from "@sd-jwt/jwt-status-list";
import { Repository } from "typeorm";
import { StatusListConfig } from "../../../auth/tenant/entitites/status-list-config";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { UpdateStatusListConfigDto } from "./dto/update-status-list-config.dto";

/**
 * Service for managing status list configuration per tenant.
 */
@Injectable()
export class StatusListConfigService {
    constructor(
        @InjectRepository(TenantEntity)
        private readonly tenantRepository: Repository<TenantEntity>,
        private readonly configService: ConfigService,
    ) {}

    /**
     * Get the default status list length from environment configuration.
     */
    getDefaultLength(): number {
        return this.configService.getOrThrow<number>("STATUS_LENGTH");
    }

    /**
     * Get the default bits per status from environment configuration.
     */
    getDefaultBits(): BitsPerStatus {
        return this.configService.getOrThrow<BitsPerStatus>("STATUS_BITS");
    }

    /**
     * Get the default TTL (in seconds) from environment configuration.
     */
    getDefaultTtl(): number {
        return this.configService.get<number>("STATUS_TTL") ?? 3600;
    }

    /**
     * Get the default immediateUpdate setting from environment configuration.
     */
    getDefaultImmediateUpdate(): boolean {
        return (
            this.configService.get<boolean>("STATUS_IMMEDIATE_UPDATE") ?? false
        );
    }

    /**
     * Get the status list configuration for a tenant.
     * @param tenantId The tenant ID
     * @returns The status list configuration or null if not set (uses global defaults)
     */
    async getConfig(tenantId: string): Promise<StatusListConfig | null> {
        const tenant = await this.tenantRepository.findOneByOrFail({
            id: tenantId,
        });
        return tenant.statusListConfig ?? null;
    }

    /**
     * Get the effective status list configuration for a tenant,
     * with defaults applied if no custom config exists.
     * @param tenantId The tenant ID
     * @returns The effective status list configuration with defaults applied
     */
    async getEffectiveConfig(tenantId: string): Promise<StatusListConfig> {
        const config = await this.getConfig(tenantId);
        return {
            length: config?.length ?? this.getDefaultLength(),
            bits: config?.bits ?? this.getDefaultBits(),
            ttl: config?.ttl ?? this.getDefaultTtl(),
            immediateUpdate:
                config?.immediateUpdate ?? this.getDefaultImmediateUpdate(),
        };
    }

    /**
     * Update the status list configuration for a tenant.
     * Note: Changes only affect newly created status lists, not existing ones.
     * @param tenantId The tenant ID
     * @param config The new status list configuration
     * @returns The updated status list configuration
     */
    async updateConfig(
        tenantId: string,
        config: UpdateStatusListConfigDto,
    ): Promise<StatusListConfig> {
        const tenant = await this.tenantRepository.findOneByOrFail({
            id: tenantId,
        });

        // Build updated config, handling null values
        const updatedConfig: StatusListConfig = {
            ...tenant.statusListConfig,
        };

        // Handle length: null means reset to default, number means set value
        if (config.length === null) {
            delete updatedConfig.length;
        } else if (config.length !== undefined) {
            updatedConfig.length = config.length;
        }

        // Handle bits: null means reset to default, number means set value
        if (config.bits === null) {
            delete updatedConfig.bits;
        } else if (config.bits !== undefined) {
            updatedConfig.bits = config.bits;
        }

        // Handle ttl: null means reset to default, number means set value
        if (config.ttl === null) {
            delete updatedConfig.ttl;
        } else if (config.ttl !== undefined) {
            updatedConfig.ttl = config.ttl;
        }

        // Handle immediateUpdate: null means reset to default, boolean means set value
        if (config.immediateUpdate === null) {
            delete updatedConfig.immediateUpdate;
        } else if (config.immediateUpdate !== undefined) {
            updatedConfig.immediateUpdate = config.immediateUpdate;
        }

        await this.tenantRepository.update(
            { id: tenantId },
            { statusListConfig: updatedConfig },
        );

        return updatedConfig;
    }

    /**
     * Reset the status list configuration for a tenant to defaults.
     * Note: This only affects newly created status lists, not existing ones.
     * @param tenantId The tenant ID
     */
    async resetConfig(tenantId: string): Promise<void> {
        const tenant = await this.tenantRepository.findOneByOrFail({
            id: tenantId,
        });
        tenant.statusListConfig = undefined;
        await this.tenantRepository.save(tenant);
    }
}
