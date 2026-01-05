import { BitsPerStatus } from "@sd-jwt/jwt-status-list";
import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    PrimaryGeneratedColumn,
} from "typeorm";
import { TenantEntity } from "../../../../auth/tenant/entitites/tenant.entity";

/**
 * Entity representing a status list for a tenant.
 * Multiple status lists can exist per tenant, optionally bound to specific credential configurations.
 */
@Entity()
export class StatusListEntity {
    /**
     * Unique identifier for the status list.
     */
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    /**
     * The ID of the tenant to which the status list belongs.
     */
    @Column("varchar")
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    /**
     * Optional credential configuration ID that this status list is exclusively bound to.
     * If null, this is a shared status list available for any credential configuration.
     */
    @Column("varchar", { nullable: true })
    credentialConfigurationId?: string | null;

    /**
     * Optional certificate ID to use for signing this status list's JWT.
     * If null, uses the tenant's default StatusList certificate.
     */
    @Column("varchar", { nullable: true })
    certId?: string | null;

    /**
     * The elements of the status list.
     */
    @Column("json")
    elements!: number[];

    /**
     * The stack of available indexes for the status list.
     */
    @Column("json")
    stack!: number[];

    /**
     * The number of bits used for each status in the status list.
     */
    @Column("int")
    bits!: BitsPerStatus;

    /**
     * The JSON Web Token (JWT) for the status list.
     */
    @Column("varchar", { nullable: true })
    jwt?: string;

    /**
     * When the current JWT expires (based on TTL).
     * Used for lazy regeneration - JWT is regenerated on request when expired.
     */
    @Column("timestamp", { nullable: true })
    expiresAt?: Date;

    /**
     * Timestamp when this status list was created.
     */
    @CreateDateColumn()
    createdAt!: Date;
}
