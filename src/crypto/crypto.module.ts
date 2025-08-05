import { Module } from '@nestjs/common';
import { CryptoService } from './crypto.service';
import { EncryptionService } from './encryption/encryption.service';
import { KeyController } from './key/key.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CertEntity } from './key/entities/cert.entity';

@Module({
    imports: [TypeOrmModule.forFeature([CertEntity])],
    controllers: [KeyController],
    providers: [CryptoService, EncryptionService],
    exports: [CryptoService, EncryptionService],
})
export class CryptoModule {}
