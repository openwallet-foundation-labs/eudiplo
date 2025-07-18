import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { JwtService } from './jwt.service';
import { AuthController } from './auth.controller';
import { ClientService } from './client.service';
import * as Joi from 'joi';
import { ConfigModule } from '@nestjs/config';

export const AUTH_VALIDATION_SCHEMA = {
    OIDC: Joi.string().optional(),
    KEYCLOAK_INTERNAL_ISSUER_URL: Joi.when('OIDC', {
        then: Joi.string().required(),
        otherwise: Joi.string().optional(),
    }),
    KEYCLOAK_CLIENT_ID: Joi.when('OIDC', {
        then: Joi.string().required(),
        otherwise: Joi.string().optional(),
    }),
    JWT_SECRET: Joi.when('OIDC', {
        then: Joi.string().optional(),
        otherwise: Joi.string().required(),
    }),
    JWT_ISSUER: Joi.when('OIDC', {
        then: Joi.string().optional(),
        otherwise: Joi.string().optional().default('eudiplo-service'),
    }),
    JWT_EXPIRES_IN: Joi.when('OIDC', {
        then: Joi.string().optional(),
        otherwise: Joi.string().default('24h'),
    }),
    AUTH_CLIENT_SECRET: Joi.when('OIDC', {
        then: Joi.string().optional(),
        otherwise: Joi.string().required(),
    }),
    AUTH_CLIENT_ID: Joi.when('OIDC', {
        then: Joi.string().optional(),
        otherwise: Joi.string().required(),
    }),
};

@Module({
    imports: [PassportModule, ConfigModule],
    providers: [JwtStrategy, JwtAuthGuard, JwtService, ClientService],
    controllers: [AuthController],
    exports: [PassportModule, JwtStrategy, JwtAuthGuard, JwtService],
})
export class AuthModule {}
