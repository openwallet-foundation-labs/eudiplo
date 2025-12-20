import { IsOptional, IsString } from "class-validator";
import { Column, Entity, OneToMany, PrimaryColumn } from "typeorm";
import { ClientEntity } from "../../client/entities/client.entity";

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
     * The clients associated with the tenant.
     */
    @OneToMany(
        () => ClientEntity,
        (client) => client.tenant,
    )
    clients!: ClientEntity[];
}
