import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CryptoService } from "./crypto.service";
import { EncryptionService } from "./encryption/encryption.service";
import { CertEntity } from "./key/entities/cert.entity";
import { KeyEntity } from "./key/entities/keys.entity";
import { KeyController } from "./key/key.controller";

@Module({
    imports: [TypeOrmModule.forFeature([CertEntity, KeyEntity])],
    controllers: [KeyController],
    providers: [CryptoService, EncryptionService],
    exports: [CryptoService, EncryptionService],
})
export class CryptoModule {}
