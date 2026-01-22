import { Column, Entity, JoinColumn, ManyToOne, OneToOne } from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { RegistrarConfigEntity } from "./registrar-config.entity";

/**
 * Stores the state of registrar interactions for a tenant.
 * Contains the IDs of registered resources at the external registrar.
 */
@Entity()
export class RegistrarEntity {
    @Column("varchar", { primary: true })
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    /**
     * The registrar configuration for this tenant.
     */
    @OneToOne(() => RegistrarConfigEntity, { nullable: true })
    @JoinColumn({ name: "tenantId" })
    config?: RegistrarConfigEntity;

    /**
     * The ID of the relying party registered at the registrar.
     */
    @Column("varchar", { nullable: true })
    relyingPartyId?: string;

    /**
     * The ID of the access certificate registered at the registrar.
     */
    @Column("varchar", { nullable: true })
    accessCertificateId?: string;
}
