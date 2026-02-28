import { HttpModule } from "@nestjs/axios";
import { DynamicModule, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TenantEntity } from "../../auth/tenant/entitites/tenant.entity";
import { CertService } from "./cert/cert.service";
import { CrlValidationService } from "./cert/crl-validation.service";
import { CryptoImplementatationModule } from "./crypto-implementation/crypto-implementation.module";
import { CertEntity } from "./entities/cert.entity";
import { CertUsageEntity } from "./entities/cert-usage.entity";
import { KeyEntity } from "./entities/keys.entity";
import { KeyController } from "./key.controller";
import { KeyService } from "./key.service";
import { KmsRegistry } from "./kms-registry.service";

@Global()
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
            controllers: [KeyController],
            providers: [
                KmsRegistry,
                KeyService,
                CertService,
                CrlValidationService,
            ],
            exports: [
                KeyService,
                KmsRegistry,
                CertService,
                CrlValidationService,
            ],
        };
    }
}
