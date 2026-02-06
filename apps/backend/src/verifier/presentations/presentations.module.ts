import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TrustModule } from "../../shared/trust/trust.module";
import { ResolverModule } from "../resolver/resolver.module";
import { MdocverifierService } from "./credential/mdocverifier/mdocverifier.service";
import { SdjwtvcverifierService } from "./credential/sdjwtvcverifier/sdjwtvcverifier.service";
import { PresentationConfig } from "./entities/presentation-config.entity";
import { PresentationManagementController } from "./presentations.controller";
import { PresentationsService } from "./presentations.service";

@Module({
    imports: [
        ResolverModule,
        HttpModule,
        TypeOrmModule.forFeature([PresentationConfig]),
        TrustModule,
    ],
    controllers: [PresentationManagementController],
    providers: [
        PresentationsService,
        SdjwtvcverifierService,
        MdocverifierService,
    ],
    exports: [PresentationsService],
})
export class PresentationsModule {}
