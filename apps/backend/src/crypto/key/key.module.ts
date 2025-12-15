import { HttpModule, HttpService } from "@nestjs/axios";
import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { PinoLogger } from "nestjs-pino/PinoLogger";
import { Repository } from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { ConfigImportService } from "../../utils/config-import/config-import.service";
import { DBKeyService } from "./adapters/db-key.service";
import { VaultKeyService } from "./adapters/vault-key.service";
import { CertService } from "./cert/cert.service";
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
                TypeOrmModule.forFeature([CertEntity, KeyEntity, TenantEntity]),
            ],
            providers: [
                CertService,
                {
                    provide: "KeyService",
                    useFactory: (
                        configService: ConfigService,
                        httpService: HttpService,
                        cryptoService: CryptoImplementationService,
                        keyRepository: Repository<KeyEntity>,
                        configImportService: ConfigImportService,
                        certRepository: Repository<CertEntity>,
                        tenantRepository: Repository<TenantEntity>,
                        logger: PinoLogger,
                    ) => {
                        const kmType = configService.get<"vault" | "file">(
                            "KM_TYPE",
                        );
                        if (kmType === "vault") {
                            return new VaultKeyService(
                                httpService,
                                configService,
                                cryptoService,
                                keyRepository,
                                configImportService,
                                certRepository,
                                tenantRepository,
                                logger,
                            );
                        }

                        return new DBKeyService(
                            configService,
                            cryptoService,
                            keyRepository,
                            configImportService,
                            certRepository,
                            tenantRepository,
                            logger,
                        );
                    },
                    inject: [
                        ConfigService,
                        HttpService,
                        CryptoImplementationService,
                        getRepositoryToken(KeyEntity),
                        ConfigImportService,
                        getRepositoryToken(CertEntity),
                        getRepositoryToken(TenantEntity),
                        PinoLogger,
                    ],
                },
            ],
            exports: ["KeyService", CertService],
        };
    }
}
