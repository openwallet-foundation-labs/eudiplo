import { TenantEntity } from "src/auth/tenant/entitites/tenant.entity";
import { Column, Entity, ManyToOne, PrimaryColumn } from "typeorm";

@Entity()
export class NonceEntity {
    @Column("varchar", { primary: true })
    tenantId!: string;
    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    @PrimaryColumn()
    nonce!: string;
    @Column()
    expiresAt!: Date;
}
