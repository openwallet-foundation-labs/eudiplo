import type { Repository } from "typeorm";
import {
    type KeyChainReference,
    keyChainIdNamesKeyChain,
    type ReferencedKeyChain,
} from "../../../../crypto/key/domain/key-chain-reference.js";
import type { KeyChainReferenceSource } from "../../../../crypto/key/ports/key-chain-reference-source.js";
import type { CredentialConfig } from "../entities/credential.entity.js";

/** Credential configs of the tenant whose `keyChainId` names the key chain. */
export class TypeOrmCredentialConfigKeyChainReferences
    implements KeyChainReferenceSource
{
    readonly kind = "CredentialConfig";

    constructor(private readonly repository: Repository<CredentialConfig>) {}

    namesKeyChain(config: unknown, keyChain: ReferencedKeyChain): boolean {
        return keyChainIdNamesKeyChain(
            (config as Partial<CredentialConfig> | null)?.keyChainId,
            keyChain,
        );
    }

    async findReferences(
        keyChain: ReferencedKeyChain,
    ): Promise<KeyChainReference[]> {
        const configs = await this.repository.find({
            where: { tenantId: keyChain.tenantId, keyChainId: keyChain.id },
            select: { id: true, description: true },
        });
        return configs.map((config) => ({
            kind: "CredentialConfig",
            id: config.id,
            description: config.description ?? undefined,
        }));
    }
}
