import type { Repository } from "typeorm";
import {
    type ManagedTrustList,
    type TrustListReference,
    trustListIdNamesList,
    urlNamesTrustList,
} from "../../../trust-list/domain/trust-list-reference.js";
import type { TrustListReferenceSource } from "../../../trust-list/ports/trust-list-reference-source.js";
import type { CredentialConfig } from "../entities/credential.entity.js";

/**
 * True when `schemaMeta.trustedAuthorities` names the list, by `trustListId`
 * or as an `etsi_tl` authority whose value is the list ID or its URL.
 */
function schemaMetaReferencesList(
    schemaMeta: CredentialConfig["schemaMeta"],
    list: ManagedTrustList,
): boolean {
    const authorities: unknown = schemaMeta?.trustedAuthorities;
    if (!Array.isArray(authorities)) return false;
    return authorities.some(
        (authority) =>
            trustListIdNamesList(authority?.trustListId, list) ||
            (authority?.frameworkType === "etsi_tl" &&
                (authority.value === list.id ||
                    urlNamesTrustList(authority.value, list))),
    );
}

/** Credential configs of the tenant whose schema metadata names the trust list. */
export class TypeOrmCredentialConfigTrustListReferences
    implements TrustListReferenceSource
{
    constructor(private readonly repository: Repository<CredentialConfig>) {}

    async findReferences(
        list: ManagedTrustList,
    ): Promise<TrustListReference[]> {
        const configs = await this.repository.find({
            where: { tenantId: list.tenantId },
            select: { id: true, description: true, schemaMeta: true },
        });
        return configs
            .filter((config) =>
                schemaMetaReferencesList(config.schemaMeta, list),
            )
            .map((config) => ({
                kind: "CredentialConfig",
                id: config.id,
                description: config.description ?? undefined,
            }));
    }
}
