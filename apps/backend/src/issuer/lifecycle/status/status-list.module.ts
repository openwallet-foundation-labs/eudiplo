import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { CryptoModule } from "../../../crypto/crypto.module";
import { StatusListEntity } from "./entities/status-list.entity";
import { StatusMapping } from "./entities/status-mapping.entity";
import { StatusListController } from "./status-list.controller";
import { StatusListService } from "./status-list.service";
import { StatusListConfigController } from "./status-list-config.controller";
import { StatusListConfigService } from "./status-list-config.service";
import { StatusListManagementController } from "./status-list-management.controller";

@Module({
    imports: [
        CryptoModule,
        TypeOrmModule.forFeature([
            StatusMapping,
            StatusListEntity,
            TenantEntity,
        ]),
    ],
    controllers: [
        StatusListController,
        StatusListConfigController,
        StatusListManagementController,
    ],
    providers: [StatusListService, StatusListConfigService],
    exports: [StatusListService, StatusListConfigService],
})
export class StatusListModule {}
