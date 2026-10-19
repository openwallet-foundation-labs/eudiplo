import { Module } from "@nestjs/common";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import type { Repository } from "typeorm";
import { AuditLogModule } from "../../audit-log/audit-log.module.js";
import {
    FEDERATION_TRUST_ANCHOR_KEYS,
    type FederationTrustAnchorKeys,
} from "../ports/federation-trust-anchor-keys.js";
import { RepositoryFederationTrustAnchorKeys } from "./adapters/repository-federation-trust-anchor-keys.js";
import { TypeOrmFederationTrustAnchorRepository } from "./adapters/typeorm-federation-trust-anchor.repository.js";
import { FederationTrustAnchorReferences } from "./application/federation-trust-anchor-references.js";
import { FederationTrustAnchorEntity } from "./entities/federation-trust-anchor.entity.js";
import { FederationTrustAnchorController } from "./federation-trust-anchor.controller.js";
import { FederationTrustAnchorService } from "./federation-trust-anchor.service.js";
import {
    FEDERATION_TRUST_ANCHOR_REPOSITORY,
    type FederationTrustAnchorRepository,
} from "./ports/federation-trust-anchor.repository.js";

@Module({
    imports: [
        TypeOrmModule.forFeature([FederationTrustAnchorEntity]),
        AuditLogModule,
    ],
    controllers: [FederationTrustAnchorController],
    providers: [
        FederationTrustAnchorService,
        FederationTrustAnchorReferences,
        {
            provide: FEDERATION_TRUST_ANCHOR_REPOSITORY,
            inject: [getRepositoryToken(FederationTrustAnchorEntity)],
            useFactory: (repository: Repository<FederationTrustAnchorEntity>) =>
                new TypeOrmFederationTrustAnchorRepository(repository),
        },
        {
            provide: FEDERATION_TRUST_ANCHOR_KEYS,
            inject: [FEDERATION_TRUST_ANCHOR_REPOSITORY],
            useFactory: (
                repository: FederationTrustAnchorRepository,
            ): FederationTrustAnchorKeys =>
                new RepositoryFederationTrustAnchorKeys(repository),
        },
    ],
    exports: [
        FederationTrustAnchorService,
        FederationTrustAnchorReferences,
        FEDERATION_TRUST_ANCHOR_REPOSITORY,
        FEDERATION_TRUST_ANCHOR_KEYS,
    ],
})
export class FederationTrustAnchorModule {}
