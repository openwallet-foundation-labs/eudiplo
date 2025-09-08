import { IsEnum, IsOptional, IsString } from "class-validator";
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { Role } from "../../roles/role.enum";
import { TenantEntity } from "../../tenant/entitites/tenant.entity";

/**
 * Represents a client in the system that belongs to a tenant.
 */
@Entity()
export class ClientEntity {
    /**
     * The unique identifier for the client.
     */
    @IsString()
    @PrimaryColumn()
    clientId: string;

    /**
     * The secret key for the client.
     */
    @IsString()
    @Column({ nullable: true })
    secret?: string;

    /**
     * The unique identifier for the tenant that the client belongs to. Only null for accounts that manage tenants, that do not belong to a client.
     */
    @Column({ nullable: true })
    tenantId?: string;

    /**
     * The description of the client.
     */
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    description?: string;

    /**
     * The roles assigned to the client.
     */
    @IsEnum(Role, { each: true })
    @Column({ type: "json" })
    roles: Role[];

    /**
     * The tenant that the client belongs to.
     */
    @ManyToOne(
        () => TenantEntity,
        (tenant) => tenant.clients,
        { onDelete: "CASCADE" },
    )
    tenant?: TenantEntity;
}
