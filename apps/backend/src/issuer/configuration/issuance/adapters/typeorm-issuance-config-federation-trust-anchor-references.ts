import type { Repository } from "typeorm";
import type { FederationTrustAnchorReference } from "../../../../trust/federation-trust-anchor/domain/federation-trust-anchor-reference.js";
import type { FederationTrustAnchorReferenceSource } from "../../../../trust/federation-trust-anchor/ports/federation-trust-anchor-reference-source.js";
import type { IssuanceConfig } from "../entities/issuance-config.entity.js";

/** The tenant's issuance configuration, when `federation.trustAnchors` names the entity ID. */
export class TypeOrmIssuanceConfigFederationTrustAnchorReferences
    implements FederationTrustAnchorReferenceSource
{
    readonly kind = "IssuanceConfig";

    constructor(private readonly repository: Repository<IssuanceConfig>) {}

    trustAnchorIds(config: unknown): string[] {
        const anchors: unknown = (config as Partial<IssuanceConfig> | null)
            ?.federation?.trustAnchors;
        if (!Array.isArray(anchors)) return [];
        return anchors
            .map((anchor) => anchor?.entityId)
            .filter(
                (entityId): entityId is string => typeof entityId === "string",
            );
    }

    async findReferences(
        tenantId: string,
        entityId: string,
    ): Promise<FederationTrustAnchorReference[]> {
        const config = await this.repository.findOne({
            where: { tenantId },
            select: { tenantId: true, federation: true },
        });
        return config && this.trustAnchorIds(config).includes(entityId)
            ? [{ kind: "IssuanceConfig" }]
            : [];
    }
}
