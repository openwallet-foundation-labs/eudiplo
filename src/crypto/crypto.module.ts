import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { EncryptionService } from './encryption/encryption.service';

@Module({
  imports: [],
  providers: [CryptoService, EncryptionService],
  exports: [CryptoService, EncryptionService],
})
export class CryptoModule {}
