import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogModule } from "../../audit-log/audit-log.module";
import { CryptoModule } from "../../crypto/crypto.module";
import { IssuerModule } from "../../issuer/issuer.module";
import { StatusListModule } from "../../issuer/lifecycle/status/status-list.module";
import { RegistrarModule } from "../../registrar/registrar.module";
import { SessionModule } from "../../session/session.module";
import { ClientModule } from "../client/client.module";
import { TenantEntity } from "./entitites/tenant.entity";
import { TenantController } from "./tenant.controller";
import { TenantService } from "./tenant.service";

@Module({
    imports: [
        TypeOrmModule.forFeature([TenantEntity]),
        AuditLogModule,
        ClientModule,
        CryptoModule,
        StatusListModule,
        SessionModule,
        ClientModule,
        TenantModule,
        IssuerModule,
        RegistrarModule,
    ],
    providers: [TenantService],
    controllers: [TenantController],
    exports: [TenantService],
})
export class TenantModule {}
