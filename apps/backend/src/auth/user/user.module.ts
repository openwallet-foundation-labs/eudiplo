import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InternalUsersProvider } from "./adapters/internal-users.service";
import { KeycloakUsersProvider } from "./adapters/keycloak-users.service";
import { UserController } from "./user.controller";
import { USERS_PROVIDER, UsersProvider } from "./user.provider";

@Module({
    providers: [
        {
            provide: USERS_PROVIDER,
            inject: [ConfigService],
            useFactory: (configService: ConfigService): UsersProvider => {
                const useKeycloak = !!configService.get<string>("OIDC");
                return useKeycloak
                    ? new KeycloakUsersProvider(configService)
                    : new InternalUsersProvider();
            },
        },
    ],
    exports: [USERS_PROVIDER],
    controllers: [UserController],
})
export class UserModule {}
