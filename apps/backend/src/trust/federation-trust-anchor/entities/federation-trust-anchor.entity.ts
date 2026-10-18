import { Column, Entity, Index, ManyToOne, PrimaryColumn } from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entities/tenant.entity.js";
import type { FederationJwks } from "../schemas/federation-trust-anchor.schema.js";

/**
 * An OpenID Federation trust anchor of a tenant with the federation keys the
 * operator obtained out of band (OpenID Federation 1.0 Section 10.2). Trust
 * chains are only accepted when they end at a registered trust anchor whose
 * entity configuration is signed with one of these keys.
 */
@Entity()
@Index("IDX_federation_trust_anchor_entity_id", ["tenantId", "entityId"], {
    unique: true,
})
export class FederationTrustAnchorEntity {
    @PrimaryColumn("varchar")
    id!: string;

    @Column("varchar", { primary: true })
    tenantId!: string;

    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    @Column("varchar")
    entityId!: string;

    @Column("varchar", { nullable: true })
    description?: string | null;

    @Column("json")
    jwks!: FederationJwks;
}
