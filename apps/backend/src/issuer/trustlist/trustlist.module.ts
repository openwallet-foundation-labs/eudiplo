import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { TrustList } from "./entities/trust-list.entity";
import { TrustListPublicController } from "./trust-list-public/trust-list-public.controller";
import { TrustListController } from "./trustlist.controller";
import { TrustListService } from "./trustlist.service";

@Module({
    imports: [TypeOrmModule.forFeature([TrustList, TenantEntity])],
    providers: [TrustListService],
    controllers: [TrustListController, TrustListPublicController],
})
export class TrustListModule {}
