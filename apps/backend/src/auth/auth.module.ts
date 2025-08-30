import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import { CryptoModule } from "../crypto/crypto.module";
import { IssuerModule } from "../issuer/issuer.module";
import { StatusListModule } from "../issuer/status-list/status-list.module";
import { RegistrarModule } from "../registrar/registrar.module";
import { SessionModule } from "../session/session.module";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { TenantEntity } from "./entitites/tenant.entity";
import { JwtService } from "./jwt.service";
import { JwtStrategy } from "./jwt.strategy";
import { TenantController } from "./tenant/tenant.controller";
import { TenantService } from "./tenant/tenant.service";

export const DEFAULT_JWT_SECRET = "supersecret";
export const DEFAULT_AUTH_CLIENT_ID = "root";
export const DEFAULT_AUTH_CLIENT_SECRET = "root";

@Module({
    imports: [
        PassportModule,
        ConfigModule,
        CryptoModule,
        StatusListModule,
        RegistrarModule,
        SessionModule,
        IssuerModule,
        TypeOrmModule.forFeature([TenantEntity]),
    ],
    providers: [
        JwtStrategy,
        JwtAuthGuard,
        JwtService,
        TenantService,
        makeGaugeProvider({
            name: "tenant_total",
            help: "Total number of tenants",
        }),
        AuthService,
    ],
    controllers: [AuthController, TenantController],
    exports: [PassportModule, JwtStrategy, JwtAuthGuard, JwtService],
})
export class AuthModule {}
