import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import { CryptoModule } from "../../crypto/crypto.module";
import { IssuerModule } from "../../issuer/issuer.module";
import { StatusListModule } from "../../issuer/status-list/status-list.module";
import { RegistrarModule } from "../../registrar/registrar.module";
import { SessionModule } from "../../session/session.module";
import { ClientModule } from "../client/client.module";
import { TenantEntity } from "./entitites/tenant.entity";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([TenantEntity]),
        ClientModule,
        CryptoModule,
        StatusListModule,
        RegistrarModule,
        SessionModule,
        ClientModule,
        TenantModule,
        IssuerModule,
    ],
    providers: [
        TenantService,
        makeGaugeProvider({
            name: "tenant_total",
            help: "Total number of tenants",
        }),
    ],
    controllers: [TenantController],
    exports: [TenantService],
})
export class TenantModule {}
