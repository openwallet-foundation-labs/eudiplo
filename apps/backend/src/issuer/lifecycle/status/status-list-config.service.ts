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
     * Get the default status list capacity from environment configuration.
     */
    getDefaultCapacity(): number {
        return this.configService.getOrThrow<number>("STATUS_CAPACITY");
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
            capacity: config?.capacity ?? this.getDefaultCapacity(),
            bits: config?.bits ?? this.getDefaultBits(),
            ttl: config?.ttl ?? this.getDefaultTtl(),
            immediateUpdate:
                config?.immediateUpdate ?? this.getDefaultImmediateUpdate(),
        };
    }

    /**
     * Update the status list configuration for a tenant.
     * Note: Changes only affect newly created status lists, not existing ones.
     *
     * Fields set to `null` will use the global default.
     * Fields set to a value will override the default.
     *
     * @param tenantId The tenant ID
     * @param config The new status list configuration
     * @returns The updated status list configuration
     */
    async updateConfig(
        tenantId: string,
        config: UpdateStatusListConfigDto,
    ): Promise<StatusListConfig> {
        await this.tenantRepository.findOneByOrFail({ id: tenantId });

        // Replace config entirely - null values mean "use default"
        const updatedConfig: StatusListConfig = {
            capacity: config.capacity ?? undefined,
            bits: config.bits ?? undefined,
            ttl: config.ttl ?? undefined,
            immediateUpdate: config.immediateUpdate ?? undefined,
        };

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
