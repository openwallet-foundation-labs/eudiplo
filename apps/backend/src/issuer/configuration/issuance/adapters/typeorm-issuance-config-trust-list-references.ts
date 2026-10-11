import type { Repository } from "typeorm";
import {
    type ManagedTrustList,
    type TrustListReference,
    trustListRefNamesList,
} from "../../../trust-list/domain/trust-list-reference.js";
import type { TrustListReferenceSource } from "../../../trust-list/ports/trust-list-reference-source.js";
import type { IssuanceConfig } from "../entities/issuance-config.entity.js";

function refsNameList(refs: unknown, list: ManagedTrustList): boolean {
    return (
        Array.isArray(refs) &&
        refs.some((ref: unknown) => trustListRefNamesList(ref, list))
    );
}

/**
 * The tenant's issuance configuration, when its wallet provider trust lists,
 * shared or of an authorization server, name the trust list.
 */
export class TypeOrmIssuanceConfigTrustListReferences
    implements TrustListReferenceSource
{
    constructor(private readonly repository: Repository<IssuanceConfig>) {}

    async findReferences(
        list: ManagedTrustList,
    ): Promise<TrustListReference[]> {
        const config = await this.repository.findOne({
            where: { tenantId: list.tenantId },
            select: {
                tenantId: true,
                walletProviderTrustLists: true,
                authorizationServers: true,
            },
        });
        if (!config) return [];
        const servers: unknown = config.authorizationServers;
        const referenced =
            refsNameList(config.walletProviderTrustLists, list) ||
            (Array.isArray(servers) &&
                servers.some((server) =>
                    refsNameList(server?.walletProviderTrustLists, list),
                ));
        return referenced ? [{ kind: "IssuanceConfig" }] : [];
    }
}
