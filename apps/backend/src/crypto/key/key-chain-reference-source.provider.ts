import type { Provider } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { ObjectLiteral, Repository } from "typeorm";
import { KeyChainReferences } from "./application/key-chain-references.js";
import type { KeyChainReferenceSource } from "./ports/key-chain-reference-source.js";

/**
 * Provider that builds a reference source on the repository of `entity` and
 * registers it with {@link KeyChainReferences}, which the global `KeyModule`
 * provides. The module that lists it must import
 * `TypeOrmModule.forFeature([entity])`.
 */
export function provideKeyChainReferenceSource<Entity extends ObjectLiteral>(
    source: new (repository: Repository<Entity>) => KeyChainReferenceSource,
    entity: new () => Entity,
): Provider {
    return {
        provide: source,
        inject: [getRepositoryToken(entity), KeyChainReferences],
        useFactory: (
            repository: Repository<Entity>,
            references: KeyChainReferences,
        ) => {
            const instance = new source(repository);
            references.register(instance);
            return instance;
        },
    };
}
