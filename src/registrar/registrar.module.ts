import { Module } from '@nestjs/common';
import { RegistrarService } from './registrar.service';
import { CryptoModule } from '../crypto/crypto.module';
import * as Joi from 'joi';
import { PresentationsModule } from '../verifier/presentations/presentations.module';

export const REGISTRAR_VALIDATION_SCHEMA = {
    REGISTRAR_URL: Joi.string(),
    OIDC_ISSUER_URL: Joi.string().when('REGISTRAR_URL', {
        is: Joi.exist(),
        then: Joi.required(),
    }),
    OIDC_CLIENT_ID: Joi.string().when('REGISTRAR_URL', {
        is: Joi.exist(),
        then: Joi.required(),
    }),
    OIDC_CLIENT_SECRET: Joi.string().when('REGISTRAR_URL', {
        is: Joi.exist(),
        then: Joi.required(),
    }),
};

@Module({
    imports: [CryptoModule, PresentationsModule],
    providers: [RegistrarService],
    exports: [RegistrarService],
})
export class RegistrarModule {}
