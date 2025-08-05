import { Global, Module } from '@nestjs/common';
import * as Joi from 'joi';
import { CryptoImplementationService } from './crypto.service';
import { ConfigModule } from '@nestjs/config';

export const CRYPTO_VALIDATION_SCHEMA = {
    CRYPTO_ALG: Joi.string().valid('ES256').default('ES256'),
};

@Global()
@Module({
    imports: [ConfigModule],
    providers: [CryptoImplementationService],
    exports: [CryptoImplementationService],
})
export class CryptoModule {}
