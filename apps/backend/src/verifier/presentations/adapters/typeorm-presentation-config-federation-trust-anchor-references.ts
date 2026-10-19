import type { Repository } from "typeorm";
import type { FederationTrustAnchorReference } from "../../../trust/federation-trust-anchor/domain/federation-trust-anchor-reference.js";
import type { FederationTrustAnchorReferenceSource } from "../../../trust/federation-trust-anchor/ports/federation-trust-anchor-reference-source.js";
import { federationTrustAnchorIds } from "../domain/trusted-authority-requirement.js";
import type { PresentationConfig } from "../entities/presentation-config.entity.js";

/**
 * Presentation configs of the tenant with a credential query in which
 * federation decides trust (no `etsi_tl` entry) and that names the entity ID.
 */
export class TypeOrmPresentationConfigFederationTrustAnchorReferences
    implements FederationTrustAnchorReferenceSource
{
    readonly kind = "PresentationConfig";

    constructor(private readonly repository: Repository<PresentationConfig>) {}

    trustAnchorIds(config: unknown): string[] {
        const credentials: unknown = (
            config as Partial<PresentationConfig> | null
        )?.dcql_query?.credentials;
        if (!Array.isArray(credentials)) return [];
        // Import documents are not validated yet; skip malformed queries.
        return federationTrustAnchorIds(
            credentials.flatMap((credential: unknown) => {
                const authorities = (
                    credential as { trusted_authorities?: unknown } | null
                )?.trusted_authorities;
                if (!Array.isArray(authorities)) return [];
                return [
                    {
                        trusted_authorities: authorities.filter(
                            (authority: unknown) =>
                                typeof authority === "object" &&
                                authority !== null,
                        ),
                    },
                ];
            }),
        );
    }

    async findReferences(
        tenantId: string,
        entityId: string,
    ): Promise<FederationTrustAnchorReference[]> {
        const configs = await this.repository.find({
            where: { tenantId },
            select: { id: true, description: true, dcql_query: true },
        });
        return configs
            .filter((config) => this.trustAnchorIds(config).includes(entityId))
            .map((config) => ({
                kind: "PresentationConfig",
                id: config.id,
                description: config.description ?? undefined,
            }));
    }
}
