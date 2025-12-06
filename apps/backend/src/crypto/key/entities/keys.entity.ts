import { JWK } from "jose";
import { Column, Entity, ManyToOne } from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";

/**
 * Key usage types.
 */
export type KeyUsage = "sign" | "encrypt";

@Entity()
export class KeyEntity {
    /**
     * Unique identifier for the key.
     */
    @Column("varchar", { primary: true })
    id!: string;

    /**
     * Description of the key.
     */
    @Column("varchar", { nullable: true })
    description?: string;

    /**
     * Tenant ID for the key.
     */
    @Column("varchar", { primary: true })
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    /**
     * The key material.
     */
    @Column("json")
    key!: JWK;

    /**
     * The usage type of the key.
     */
    @Column("varchar", { default: "sign" })
    usage!: KeyUsage;
}
