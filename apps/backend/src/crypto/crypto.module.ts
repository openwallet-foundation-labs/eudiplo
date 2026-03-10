import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CryptoService } from "./crypto.service";
import { EncryptionService } from "./encryption/encryption.service";

@Module({
    imports: [ConfigModule],
    providers: [CryptoService, EncryptionService],
    exports: [CryptoService, EncryptionService],
})
export class CryptoModule {}
