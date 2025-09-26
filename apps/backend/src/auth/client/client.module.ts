import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import { Repository } from "typeorm";
import { InternalClientsProvider } from "./adapters/internal-clients.service";
import { KeycloakClientsProvider } from "./adapters/keycloak-clients.service";
import { ClientController } from "./client.controller";
import { CLIENTS_PROVIDER, ClientsProvider } from "./client.provider";
import { ClientEntity } from "./entities/client.entity";

@Module({
    imports: [TypeOrmModule.forFeature([ClientEntity])],
    providers: [
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
    ],
    exports: [CLIENTS_PROVIDER],
    controllers: [ClientController],
})
export class ClientModule {}
