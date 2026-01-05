import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { ClientEntity } from "../../client/entities/client.entity";
import { SessionStorageConfig } from "./session-storage-config";
import { StatusListConfig } from "./status-list-config";

export type TenantStatus = "active";

/**
 * Represents a tenant in the system.
 */
@Entity()
export class TenantEntity {
    /**
     * The unique identifier for the tenant.
     */
    @IsString()
    @PrimaryColumn()
    id!: string;

    /**
     * The name of the tenant.
     */
    @IsString()
    @Column({ default: "EUDIPLO" })
    name!: string;

    /**
     * The description of the tenant.
     */
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    description?: string;

    /**
     * The current status of the tenant.
     */
    @Column("varchar", { nullable: true })
    status!: TenantStatus;

    /**
     * Session storage configuration for this tenant.
     * Controls how long sessions are kept and how they are cleaned up.
     */
    @ApiPropertyOptional({
        description:
            "Session storage configuration for this tenant. Controls TTL and cleanup behavior.",
        type: () => SessionStorageConfig,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => SessionStorageConfig)
    @Column("json", { nullable: true })
    sessionConfig?: SessionStorageConfig | null;

    /**
     * Status list configuration for this tenant.
     * Controls the size and bits per status entry for newly created status lists.
     */
    @ApiPropertyOptional({
        description:
            "Status list configuration for this tenant. Only affects newly created status lists.",
        type: () => StatusListConfig,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => StatusListConfig)
    @Column("json", { nullable: true })
    statusListConfig?: StatusListConfig | null;

    /**
     * The clients associated with the tenant.
     */
    @OneToMany(
        () => ClientEntity,
        (client) => client.tenant,
    )
    clients!: ClientEntity[];
}
