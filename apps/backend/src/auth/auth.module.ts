import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import { Repository } from "typeorm";
import { CryptoModule } from "../crypto/crypto.module";
import { IssuerModule } from "../issuer/issuer.module";
import { StatusListModule } from "../issuer/status-list/status-list.module";
import { RegistrarModule } from "../registrar/registrar.module";
import { SessionModule } from "../session/session.module";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./auth.guard";
import { AuthService } from "./auth.service";
import { InternalClientsProvider } from "./client/adapters/internal-clients.service";
import { KeycloakClientsProvider } from "./client/adapters/keycloak-clients.service";
import { ClientController } from "./client/client.controller";
import { CLIENTS_PROVIDER, ClientsProvider } from "./client/client.provider";
import { ClientEntity } from "./client/entities/client.entity";
import { JwtService } from "./jwt.service";
import { JwtStrategy } from "./jwt.strategy";
import { TenantEntity } from "./tenant/entitites/tenant.entity";
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
        TypeOrmModule.forFeature([TenantEntity, ClientEntity]),
    ],
    providers: [
        JwtStrategy,
        JwtAuthGuard,
        JwtService,
        TenantService,
        {
            provide: CLIENTS_PROVIDER,
            inject: [ConfigService, getRepositoryToken(ClientEntity)],
            useFactory: (
                cfg: ConfigService,
                repo: Repository<ClientEntity>,
            ): ClientsProvider => {
                const useKeycloak = !!cfg.get<string>("OIDC"); // if OIDC base/realm is configured, pick KC
                return useKeycloak
                    ? new KeycloakClientsProvider(cfg, repo)
                    : new InternalClientsProvider(cfg, repo);
            },
        },
        makeGaugeProvider({
            name: "tenant_total",
            help: "Total number of tenants",
        }),
        AuthService,
    ],
    controllers: [AuthController, TenantController, ClientController],
    exports: [
        CLIENTS_PROVIDER,
        PassportModule,
        JwtStrategy,
        JwtAuthGuard,
        JwtService,
    ],
})
export class AuthModule {}
