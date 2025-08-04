import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { EncryptionService } from './encryption/encryption.service';
import { KeyController } from './key/key.controller';

@Module({
    imports: [],
    controllers: [KeyController],
    providers: [CryptoService, EncryptionService],
    exports: [CryptoService, EncryptionService],
})
export class CryptoModule {}
