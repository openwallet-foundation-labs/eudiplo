import { Column, Entity, ManyToOne } from "typeorm";
import { TenantEntity } from "../../auth/entitites/tenant.entity";

@Entity()
export class RegistrarEntity {
    @Column("varchar", { primary: true })
    tenantId: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant: TenantEntity;

    @Column("varchar")
    relyingPartyId: string;

    @Column("varchar")
    accessCertificateId: string;
}
