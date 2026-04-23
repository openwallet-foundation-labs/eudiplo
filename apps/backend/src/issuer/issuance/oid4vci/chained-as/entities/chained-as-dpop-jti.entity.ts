import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Persisted DPoP JTI replay-protection record for Chained AS token requests.
 *
 * Each record represents a DPoP JTI that has already been used within the
 * freshness window. Storing this in the database ensures replay protection
 * is effective across all horizontally-scaled backend instances.
 *
 * Records are safe to purge once expiresAt has passed.
 */
@Entity("chained_as_dpop_jti")
export class ChainedAsDpopJtiEntity {
    /**
     * The tenant ID this JTI belongs to.
     */
    @PrimaryColumn("varchar")
    tenantId!: string;

    /**
     * The DPoP JWT ID (jti claim).
     */
    @PrimaryColumn("varchar")
    jti!: string;

    /**
     * When this record expires and can be safely purged.
     */
    @Column()
    expiresAt!: Date;
}
