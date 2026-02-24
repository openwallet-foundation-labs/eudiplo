import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TenantEntity } from "../auth/tenant/entitites/tenant.entity";
import { CryptoService } from "./crypto.service";
import { EncryptionService } from "./encryption/encryption.service";
import { CertController } from "./key/cert/cert.controller";
import { CertEntity } from "./key/entities/cert.entity";
import { CertUsageEntity } from "./key/entities/cert-usage.entity";
import { KeyEntity } from "./key/entities/keys.entity";
import { KeyController } from "./key/key.controller";

@Module({
    imports: [
        ConfigModule,
        TypeOrmModule.forFeature([
            CertEntity,
            CertUsageEntity,
            KeyEntity,
            TenantEntity,
        ]),
    ],
    controllers: [KeyController, CertController],
    providers: [CryptoService, EncryptionService],
    exports: [CryptoService, EncryptionService],
})
export class CryptoModule {}
