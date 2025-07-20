import { Module } from '@nestjs/common';
import { RegistrarService } from './registrar.service';
import { CryptoModule } from '../crypto/crypto.module';
import * as Joi from 'joi';
import { PresentationsModule } from '../verifier/presentations/presentations.module';

/**
 * Validation schema for the registrar module.
 * Defines the required environment variables and their types.
 */
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

/**
 * RegistrarModule is responsible for managing the registrar service.
 * It provides the RegistrarService and imports necessary modules.
 */
@Module({
    imports: [CryptoModule, PresentationsModule],
    providers: [RegistrarService],
    exports: [RegistrarService],
})
export class RegistrarModule {}
