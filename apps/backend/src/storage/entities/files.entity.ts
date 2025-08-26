import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";
import { TenantEntity } from "../../auth/entitites/tenant.entity";

@Entity()
export class FileEntity {
    @PrimaryColumn()
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
}
