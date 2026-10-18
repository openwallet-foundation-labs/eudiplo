import type { Repository } from "typeorm";
import {
    type KeyChainReference,
    keyChainIdNamesKeyChain,
    type ReferencedKeyChain,
} from "../../../crypto/key/domain/key-chain-reference.js";
import type { KeyChainReferenceSource } from "../../../crypto/key/ports/key-chain-reference-source.js";
import type { PresentationConfig } from "../entities/presentation-config.entity.js";

/** Presentation configs of the tenant whose `accessKeyChainId` names the key chain. */
export class TypeOrmPresentationConfigKeyChainReferences
    implements KeyChainReferenceSource
{
    readonly kind = "PresentationConfig";

    constructor(private readonly repository: Repository<PresentationConfig>) {}

    namesKeyChain(config: unknown, keyChain: ReferencedKeyChain): boolean {
        return keyChainIdNamesKeyChain(
            (config as Partial<PresentationConfig> | null)?.accessKeyChainId,
            keyChain,
        );
    }

    async findReferences(
        keyChain: ReferencedKeyChain,
    ): Promise<KeyChainReference[]> {
        const configs = await this.repository.find({
            where: {
                tenantId: keyChain.tenantId,
                accessKeyChainId: keyChain.id,
            },
            select: { id: true, description: true },
        });
        return configs.map((config) => ({
            kind: "PresentationConfig",
            id: config.id,
            description: config.description ?? undefined,
        }));
    }
}
