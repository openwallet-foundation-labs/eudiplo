import type { Repository } from "typeorm";
import {
    type KeyChainReference,
    keyChainIdNamesKeyChain,
    type ReferencedKeyChain,
} from "../../../crypto/key/domain/key-chain-reference.js";
import type { KeyChainReferenceSource } from "../../../crypto/key/ports/key-chain-reference-source.js";
import type { TrustList } from "../entities/trust-list.entity.js";

function entitiesNameKeyChain(
    entities: unknown,
    keyChain: ReferencedKeyChain,
): boolean {
    return (
        Array.isArray(entities) &&
        entities.some(
            (entity) =>
                entity?.type === "internal" &&
                (keyChainIdNamesKeyChain(entity.issuerKeyChainId, keyChain) ||
                    keyChainIdNamesKeyChain(
                        entity.revocationKeyChainId,
                        keyChain,
                    )),
        )
    );
}

/**
 * Trust lists of the tenant that the key chain signs (`keyChainId`), or whose
 * internal entities take their certificates from it (`issuerKeyChainId`,
 * `revocationKeyChainId`). Deleting the signing key chain would also delete
 * the trust list.
 */
export class TypeOrmTrustListKeyChainReferences
    implements KeyChainReferenceSource
{
    readonly kind = "TrustList";

    constructor(private readonly repository: Repository<TrustList>) {}

    /** Checks a trust list document `spec` (`entities`) or a stored list (`entityConfig`). */
    namesKeyChain(config: unknown, keyChain: ReferencedKeyChain): boolean {
        const { keyChainId, entities, entityConfig } =
            (config as (Partial<TrustList> & { entities?: unknown }) | null) ??
            {};
        return (
            keyChainIdNamesKeyChain(keyChainId, keyChain) ||
            entitiesNameKeyChain(entities, keyChain) ||
            entitiesNameKeyChain(entityConfig, keyChain)
        );
    }

    async findReferences(
        keyChain: ReferencedKeyChain,
    ): Promise<KeyChainReference[]> {
        const lists = await this.repository.find({
            where: { tenantId: keyChain.tenantId },
            select: {
                id: true,
                description: true,
                keyChainId: true,
                entityConfig: true,
            },
        });
        return lists
            .filter((list) => this.namesKeyChain(list, keyChain))
            .map((list) => ({
                kind: "TrustList",
                id: list.id,
                description: list.description ?? undefined,
            }));
    }
}
