import { HttpModule, HttpService } from "@nestjs/axios";
import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DBKeyService } from "./adapters/db-key.service";
import { VaultKeyService } from "./adapters/vault-key.service";
import { CryptoImplementatationModule } from "./crypto-implementation/crypto-implementation.module";
import { CryptoImplementationService } from "./crypto-implementation/crypto-implementation.service";
import { CertEntity } from "./entities/cert.entity";
import { KeyEntity } from "./entities/keys.entity";

@Global()
@Module({})
export class KeyModule {
    static forRoot(): DynamicModule {
        return {
            module: KeyModule,
            imports: [
                HttpModule,
                ConfigModule,
                CryptoImplementatationModule,
                TypeOrmModule.forFeature([CertEntity, KeyEntity]),
            ],
            providers: [
                {
                    provide: "KeyService",
                    useFactory: (
                        configService: ConfigService,
                        httpService: HttpService,
                        cryptoService: CryptoImplementationService,
                        certRepository: Repository<CertEntity>,
                        keyRepository: Repository<KeyEntity>,
                    ) => {
                        const kmType = configService.get<"vault" | "file">(
                            "KM_TYPE",
                        );
                        if (kmType === "vault") {
                            return new VaultKeyService(
                                httpService,
                                configService,
                                cryptoService,
                                certRepository,
                                keyRepository,
                            );
                        }

                        return new DBKeyService(
                            configService,
                            cryptoService,
                            certRepository,
                            keyRepository,
                        );
                    },
                    inject: [
                        ConfigService,
                        HttpService,
                        CryptoImplementationService,
                        getRepositoryToken(CertEntity),
                        getRepositoryToken(KeyEntity),
                    ],
                },
            ],
            exports: ["KeyService"],
        };
    }
}
