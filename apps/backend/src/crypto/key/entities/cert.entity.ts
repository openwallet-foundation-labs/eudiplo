import {
    Column,
    CreateDateColumn,
    Entity,
    ManyToOne,
    UpdateDateColumn,
} from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";

export type CertificateType = "access" | "signing";

/**
 * Entity to manage certificates for keys.
 */
@Entity()
export class CertEntity {
    /**
     * Unique identifier for the key.
     */
    @Column("varchar", { primary: true })
    id: string;

    /**
     * Tenant ID for the key.
     */
    @Column("varchar", { primary: true })
    tenantId: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant: TenantEntity;

    /**
     * Certificate in PEM format.
     */
    @Column("varchar")
    crt: string;

    /**
     * Type of the certificate (access or signing).
     */
    @Column("varchar", { default: "signing", primary: true })
    type: CertificateType;

    /**
     * Description of the key.
     */
    @Column("varchar", { nullable: true })
    description?: string;

    /**
     * The timestamp when the VP request was created.
     */
    @CreateDateColumn()
    createdAt: Date;

    /**
     * The timestamp when the VP request was last updated.
     */
    @UpdateDateColumn()
    updatedAt: Date;
}
