import type { Provider } from "@nestjs/common";
import { getRepositoryToken } from "@nestjs/typeorm";
import type { ObjectLiteral, Repository } from "typeorm";
import { FederationTrustAnchorReferences } from "../application/federation-trust-anchor-references.js";
import type { FederationTrustAnchorReferenceSource } from "../ports/federation-trust-anchor-reference-source.js";

/**
 * Provider that builds a reference source on the repository of `entity` and
 * registers it with {@link FederationTrustAnchorReferences}. The module that
 * lists it must import `FederationTrustAnchorModule` and
 * `TypeOrmModule.forFeature([entity])`.
 */
export function provideFederationTrustAnchorReferenceSource<
    Entity extends ObjectLiteral,
>(
    source: new (
        repository: Repository<Entity>,
    ) => FederationTrustAnchorReferenceSource,
    entity: new () => Entity,
): Provider {
    return {
        provide: source,
        inject: [getRepositoryToken(entity), FederationTrustAnchorReferences],
        useFactory: (
            repository: Repository<Entity>,
            references: FederationTrustAnchorReferences,
        ) => {
            const instance = new source(repository);
            references.register(instance);
            return instance;
        },
    };
}
