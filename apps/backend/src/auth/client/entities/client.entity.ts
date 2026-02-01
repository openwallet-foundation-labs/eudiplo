import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEnum, IsOptional, IsString } from "class-validator";
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
    clientId!: string;

    /**
     * The secret key for the client.
     */
    @IsString()
    @IsOptional()
    @Column({ nullable: true })
    secret?: string;

    /**
     * The unique identifier for the tenant that the client belongs to. Only null for accounts that manage tenants, that do not belong to a client
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
    roles!: Role[];

    /**
     * Optional list of presentation config IDs this client is allowed to use.
     * If null or empty, the client can use all presentation configs (backward compatible).
     * Only relevant if the client has the 'presentation:offer' role.
     */
    @ApiPropertyOptional({
        type: [String],
        description:
            "List of presentation config IDs this client can use. If empty/null, all configs are allowed.",
        example: ["age-verification", "kyc-basic"],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Column({ type: "json", nullable: true })
    allowedPresentationConfigs?: string[] | null;

    /**
     * Optional list of issuance config IDs this client is allowed to use.
     * If null or empty, the client can use all issuance configs (backward compatible).
     * Only relevant if the client has the 'issuance:offer' role.
     */
    @ApiPropertyOptional({
        type: [String],
        description:
            "List of issuance config IDs this client can use. If empty/null, all configs are allowed.",
        example: ["pid", "mdl"],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @Column({ type: "json", nullable: true })
    allowedIssuanceConfigs?: string[] | null;

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
