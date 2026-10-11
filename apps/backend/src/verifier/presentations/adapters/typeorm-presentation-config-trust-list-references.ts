import type { Repository } from "typeorm";
import {
    type ManagedTrustList,
    type TrustListReference,
    trustListRefNamesList,
} from "../../../issuer/trust-list/domain/trust-list-reference.js";
import type { TrustListReferenceSource } from "../../../issuer/trust-list/ports/trust-list-reference-source.js";
import type { PresentationConfig } from "../entities/presentation-config.entity.js";

/** True when a credential query of the DCQL query accepts issuers from the list (`etsi_tl`). */
function dcqlQueryReferencesList(
    dcqlQuery: PresentationConfig["dcql_query"] | undefined,
    list: ManagedTrustList,
): boolean {
    const credentials: unknown = dcqlQuery?.credentials;
    if (!Array.isArray(credentials)) return false;
    return credentials.some((credential) => {
        const authorities: unknown = credential?.trusted_authorities;
        return (
            Array.isArray(authorities) &&
            authorities.some(
                (authority) =>
                    authority?.type === "etsi_tl" &&
                    Array.isArray(authority.values) &&
                    authority.values.some((ref: unknown) =>
                        trustListRefNamesList(ref, list),
                    ),
            )
        );
    });
}

/** Presentation configs of the tenant whose DCQL query names the trust list. */
export class TypeOrmPresentationConfigTrustListReferences
    implements TrustListReferenceSource
{
    constructor(private readonly repository: Repository<PresentationConfig>) {}

    async findReferences(
        list: ManagedTrustList,
    ): Promise<TrustListReference[]> {
        const configs = await this.repository.find({
            where: { tenantId: list.tenantId },
            select: { id: true, description: true, dcql_query: true },
        });
        return configs
            .filter((config) =>
                dcqlQueryReferencesList(config.dcql_query, list),
            )
            .map((config) => ({
                kind: "PresentationConfig",
                id: config.id,
                description: config.description ?? undefined,
            }));
    }
}
