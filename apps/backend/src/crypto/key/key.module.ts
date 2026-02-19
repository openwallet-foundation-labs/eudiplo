import { HttpModule, HttpService } from "@nestjs/axios";
import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { ConfigImportService } from "../../shared/utils/config-import/config-import.service";
import { ConfigImportOrchestratorService } from "../../shared/utils/config-import/config-import-orchestrator.service";
import { DBKeyService } from "./adapters/db-key.service";
import { VaultKeyService } from "./adapters/vault-key.service";
import { CertService } from "./cert/cert.service";
import { CrlValidationService } from "./cert/crl-validation.service";
import { CryptoImplementatationModule } from "./crypto-implementation/crypto-implementation.module";
import { CryptoImplementationService } from "./crypto-implementation/crypto-implementation.service";
import { CertEntity } from "./entities/cert.entity";
import { CertUsageEntity } from "./entities/cert-usage.entity";
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
                TypeOrmModule.forFeature([
                    CertEntity,
                    CertUsageEntity,
                    KeyEntity,
                    TenantEntity,
                ]),
            ],
            providers: [
                CertService,
                CrlValidationService,
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
                        configImportOrchestrator: ConfigImportOrchestratorService,
                    ) => {
                        const kmType = configService.get<"vault" | "db">(
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
                                configImportOrchestrator,
                            );
                        }

                        return new DBKeyService(
                            configService,
                            cryptoService,
                            keyRepository,
                            configImportService,
                            certRepository,
                            tenantRepository,
                            configImportOrchestrator,
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
                        ConfigImportOrchestratorService,
                    ],
                },
            ],
            exports: ["KeyService", CertService, CrlValidationService],
        };
    }
}
