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
    MULTI_TENANT: Joi.boolean().default(false),
    KEYCLOAK_INTERNAL_ISSUER_URL: Joi.when('MULTI_TENANT', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().optional(),
    }),
    KEYCLOAK_CLIENT_ID: Joi.when('MULTI_TENANT', {
        is: true,
        then: Joi.string().required(),
        otherwise: Joi.string().optional(),
    }),
    JWT_SECRET: Joi.when('MULTI_TENANT', {
        is: false,
        then: Joi.string().required(),
        otherwise: Joi.string().optional(),
    }),
    JWT_ISSUER: Joi.when('MULTI_TENANT', {
        is: false,
        then: Joi.string().optional().default('eudiplo-service'),
        otherwise: Joi.string().optional(),
    }),
    JWT_EXPIRES_IN: Joi.when('MULTI_TENANT', {
        is: false,
        then: Joi.string().default('1h'),
        otherwise: Joi.string().optional(),
    }),
    AUTH_CLIENT_SECRET: Joi.when('MULTI_TENANT', {
        is: false,
        then: Joi.string().required(),
        otherwise: Joi.string().optional(),
    }),
    AUTH_CLIENT_ID: Joi.when('MULTI_TENANT', {
        is: false,
        then: Joi.string().required(),
        otherwise: Joi.string().optional(),
    }),
};

@Module({
    imports: [PassportModule, ConfigModule],
    providers: [JwtStrategy, JwtAuthGuard, JwtService, ClientService],
    controllers: [AuthController],
    exports: [PassportModule, JwtStrategy, JwtAuthGuard, JwtService],
})
export class AuthModule {}
