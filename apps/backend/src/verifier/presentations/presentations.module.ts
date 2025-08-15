import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Oid4vpModule } from "../oid4vp/oid4vp.module";
import { ResolverModule } from "../resolver/resolver.module";
import { PresentationConfig } from "./entities/presentation-config.entity";
import { PresentationManagementController } from "./presentations.controller";
import { PresentationsService } from "./presentations.service";

@Module({
    imports: [
        ResolverModule,
        HttpModule,
        forwardRef(() => Oid4vpModule),
        TypeOrmModule.forFeature([PresentationConfig]),
    ],
    controllers: [PresentationManagementController],
    providers: [PresentationsService],
    exports: [PresentationsService],
})
export class PresentationsModule {}
