import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TenantEntity } from "../../auth/tenant/entities/tenant.entity.js";
import { provideKeyChainReferenceSource } from "../../crypto/key/key-chain-reference-source.provider.js";
import { TrustListRenewalJob } from "./adapters/trust-list-renewal.job.js";
import { TypeOrmTrustListKeyChainReferences } from "./adapters/typeorm-trust-list-key-chain-references.js";
import { TrustListReferences } from "./application/trust-list-references.js";
import { TrustList } from "./entities/trust-list.entity.js";
import { TrustListVersion } from "./entities/trust-list-version.entity.js";
import { TrustListPublicController } from "./trust-list-public/trust-list-public.controller.js";
import { TrustListController } from "./trustlist.controller.js";
import { TrustListService } from "./trustlist.service.js";

@Module({
    imports: [
        TypeOrmModule.forFeature([TrustList, TrustListVersion, TenantEntity]),
    ],
    providers: [
        TrustListService,
        TrustListReferences,
        TrustListRenewalJob,
        provideKeyChainReferenceSource(
            TypeOrmTrustListKeyChainReferences,
            TrustList,
        ),
    ],
    controllers: [TrustListController, TrustListPublicController],
    exports: [TrustListService, TrustListReferences],
})
export class TrustListModule {}
