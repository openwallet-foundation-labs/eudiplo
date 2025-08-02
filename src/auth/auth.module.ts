import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { JwtService } from './jwt.service';
import { AuthController } from './auth.controller';
import { ClientService } from './client.service';
import * as Joi from 'joi';
import { ConfigModule } from '@nestjs/config';
import { CryptoModule } from '../crypto/crypto.module';
import { StatusListModule } from '../issuer/status-list/status-list.module';
import { RegistrarModule } from '../registrar/registrar.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientEntry } from './entitites/client.entity';
import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';

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
    imports: [
        PassportModule,
        ConfigModule,
        CryptoModule,
        StatusListModule,
        RegistrarModule,
        TypeOrmModule.forFeature([ClientEntry]),
    ],
    providers: [
        JwtStrategy,
        JwtAuthGuard,
        JwtService,
        ClientService,
        makeGaugeProvider({
            name: 'tenant_client_total',
            help: 'Total number of tenant clients',
        }),
    ],
    controllers: [AuthController],
    exports: [PassportModule, JwtStrategy, JwtAuthGuard, JwtService],
})
export class AuthModule {}
