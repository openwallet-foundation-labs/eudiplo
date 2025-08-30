import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TenantEntity } from "../auth/entitites/tenant.entity";
import { CryptoService } from "./crypto.service";
import { EncryptionService } from "./encryption/encryption.service";
import { CertEntity } from "./key/entities/cert.entity";
import { KeyEntity } from "./key/entities/keys.entity";
import { KeyController } from "./key/key.controller";

@Module({
    imports: [TypeOrmModule.forFeature([CertEntity, KeyEntity, TenantEntity])],
    controllers: [KeyController],
    providers: [CryptoService, EncryptionService],
    exports: [CryptoService, EncryptionService],
})
export class CryptoModule {}
