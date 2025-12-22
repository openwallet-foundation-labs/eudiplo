import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CryptoModule } from "../../../crypto/crypto.module";
import { StatusListEntity } from "./entities/status-list.entity";
import { StatusMapping } from "./entities/status-mapping.entity";
import { StatusListController } from "./status-list.controller";
import { StatusListService } from "./status-list.service";

@Module({
    imports: [
        CryptoModule,
        TypeOrmModule.forFeature([StatusMapping, StatusListEntity]),
    ],
    controllers: [StatusListController],
    providers: [StatusListService],
    exports: [StatusListService],
})
export class StatusListModule {}
