import type { Repository } from "typeorm";
import {
    type KeyChainReference,
    keyChainIdNamesKeyChain,
    type ReferencedKeyChain,
} from "../../../crypto/key/domain/key-chain-reference.js";
import type { KeyChainReferenceSource } from "../../../crypto/key/ports/key-chain-reference-source.js";
import type { StatusListEntity } from "../entities/status-list.entity.js";

/** Status lists of the tenant whose `keyChainId` names the key chain. */
export class TypeOrmStatusListKeyChainReferences
    implements KeyChainReferenceSource
{
    readonly kind = "StatusList";

    constructor(private readonly repository: Repository<StatusListEntity>) {}

    namesKeyChain(config: unknown, keyChain: ReferencedKeyChain): boolean {
        return keyChainIdNamesKeyChain(
            (config as Partial<StatusListEntity> | null)?.keyChainId,
            keyChain,
        );
    }

    async findReferences(
        keyChain: ReferencedKeyChain,
    ): Promise<KeyChainReference[]> {
        const lists = await this.repository.find({
            where: { tenantId: keyChain.tenantId, keyChainId: keyChain.id },
            select: { id: true, description: true },
        });
        return lists.map((list) => ({
            kind: "StatusList",
            id: list.id,
            description: list.description ?? undefined,
        }));
    }
}
