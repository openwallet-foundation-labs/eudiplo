import type { Provider } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { ObjectLiteral, Repository } from "typeorm";
import { TrustListReferences } from "./application/trust-list-references.js";
import type { TrustListReferenceSource } from "./ports/trust-list-reference-source.js";

/**
 * Provider that builds a reference source on the repository of `entity` and
 * registers it with {@link TrustListReferences}. The module that lists it
 * must import `TrustListModule` and `TypeOrmModule.forFeature([entity])`.
 */
export function provideTrustListReferenceSource<Entity extends ObjectLiteral>(
    source: new (repository: Repository<Entity>) => TrustListReferenceSource,
    entity: new () => Entity,
): Provider {
    return {
        provide: source,
        inject: [getRepositoryToken(entity), TrustListReferences],
        useFactory: (
            repository: Repository<Entity>,
            references: TrustListReferences,
        ) => {
            const instance = new source(repository);
            references.register(instance);
            return instance;
        },
    };
}
