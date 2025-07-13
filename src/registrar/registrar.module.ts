import { Module } from '@nestjs/common';
import { RegistrarService } from './registrar.service';
import { CryptoModule } from '../crypto/crypto.module';
import * as Joi from 'joi';
import { PresentationsModule } from '../verifier/presentations/presentations.module';

export const REGISTRAR_VALIDATION_SCHEMA = {
    REGISTRAR_URL: Joi.string(),
    KEYCLOAK_REALM: Joi.string().when('REGISTRAR_URL', {
        is: Joi.exist(),
        then: Joi.required(),
    }),
    KEYCLOAK_AUTH_SERVER_URL: Joi.string().when('REGISTRAR_URL', {
        is: Joi.exist(),
        then: Joi.required(),
    }),
    KEYCLOAK_RESOURCE: Joi.string().when('REGISTRAR_URL', {
        is: Joi.exist(),
        then: Joi.required(),
    }),
    KEYCLOAK_CREDENTIALS_SECRET: Joi.string().when('REGISTRAR_URL', {
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
