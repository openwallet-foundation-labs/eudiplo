import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ResolverModule } from "../resolver/resolver.module";
import { PresentationConfig } from "./entities/presentation-config.entity";
import { PresentationManagementController } from "./presentations.controller";
import { PresentationsService } from "./presentations.service";

@Module({
    imports: [
        ResolverModule,
        HttpModule,
        TypeOrmModule.forFeature([PresentationConfig]),
    ],
    controllers: [PresentationManagementController],
    providers: [PresentationsService],
    exports: [PresentationsService],
})
export class PresentationsModule {}
