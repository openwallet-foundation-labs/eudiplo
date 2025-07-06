import { Module } from '@nestjs/common';
import { RegistrarService } from './registrar.service';
import { CryptoModule } from 'src/crypto/crypto.module';
import * as Joi from 'joi';
import { PresentationsModule } from 'src/verifier/presentations/presentations.module';

export const REGISTRAR_VALIDATION_SCHEMA = {
  REGISTRAR_URL: Joi.string().required(),
  REGISTRAR_RENEW: Joi.boolean().default(false),
  REGISTRAR_RP_ID: Joi.string(),
  REGISTRAR_RP_NAME: Joi.string(),
  KEYCLOAK_REALM: Joi.string().required(),
  KEYCLOAK_AUTH_SERVER_URL: Joi.string().required(),
  KEYCLOAK_RESOURCE: Joi.string().required(),
  KEYCLOAK_CREDENTIALS_SECRET: Joi.string().required(),
};

@Module({
  imports: [CryptoModule, PresentationsModule],
  providers: [RegistrarService],
  exports: [RegistrarService],
})
export class RegistrarModule {}
