import { Column, Entity, ManyToOne } from "typeorm";
import { TenantEntity } from "../../../../auth/tenant/entitites/tenant.entity";

@Entity()
export class StatusMapping {
    @Column({ type: "varchar", primary: true })
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    @Column({ type: "varchar", primary: true })
    sessionId!: string;

    @Column({ type: "varchar", primary: true })
    list!: string;

    @Column({ type: "int", primary: true })
    index!: number;

    @Column({ type: "varchar", primary: true })
    credentialConfigurationId!: string;
}
