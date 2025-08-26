import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { TypeOrmModule } from "@nestjs/typeorm";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import * as Joi from "joi";
import { CryptoModule } from "../crypto/crypto.module";
import { IssuerModule } from "../issuer/issuer.module";
import { StatusListModule } from "../issuer/status-list/status-list.module";
import { RegistrarModule } from "../registrar/registrar.module";
import { SessionModule } from "../session/session.module";
import { AuthController } from "./auth.controller";
import { JwtAuthGuard } from "./auth.guard";
import { TenantEntity } from "./entitites/tenant.entity";
import { JwtService } from "./jwt.service";
import { JwtStrategy } from "./jwt.strategy";
import { TenantController } from "./tenant/tenant.controller";
import { TenantService } from "./tenant.service";

export const DEFAULT_JWT_SECRET = "supersecret";
export const DEFAULT_AUTH_CLIENT_ID = "root";
export const DEFAULT_AUTH_CLIENT_SECRET = "root";

export const AUTH_VALIDATION_SCHEMA = {
    OIDC: Joi.string().optional(),
    OIDC_INTERNAL_ISSUER_URL: Joi.when("OIDC", {
        then: Joi.string().required(),
        otherwise: Joi.string().optional(),
    }),
    OIDC_SUB: Joi.when("OIDC", {
        then: Joi.string().default("azp"),
        otherwise: Joi.string().optional(),
    }),
    OIDC_ALGORITHM: Joi.when("OIDC", {
        then: Joi.string().default("RS256"),
        otherwise: Joi.string().optional(),
    }),
    JWT_SECRET: Joi.when("OIDC", {
        then: Joi.string().optional(),
        otherwise: Joi.string().default(DEFAULT_JWT_SECRET),
    }),
    JWT_ISSUER: Joi.when("OIDC", {
        then: Joi.string().optional(),
        otherwise: Joi.string().optional().default("eudiplo-service"),
    }),
    JWT_EXPIRES_IN: Joi.when("OIDC", {
        then: Joi.string().optional(),
        otherwise: Joi.string().default("24h"),
    }),
    AUTH_CLIENT_SECRET: Joi.when("OIDC", {
        then: Joi.string().optional(),
        otherwise: Joi.string().default(DEFAULT_AUTH_CLIENT_SECRET),
    }),
    AUTH_CLIENT_ID: Joi.when("OIDC", {
        then: Joi.string().optional(),
        otherwise: Joi.string().default(DEFAULT_AUTH_CLIENT_ID),
    }),
};
@Module({
    imports: [
        PassportModule,
        ConfigModule,
        CryptoModule,
        StatusListModule,
        RegistrarModule,
        SessionModule,
        IssuerModule,
        TypeOrmModule.forFeature([TenantEntity]),
    ],
    providers: [
        JwtStrategy,
        JwtAuthGuard,
        JwtService,
        TenantService,
        makeGaugeProvider({
            name: "tenant_total",
            help: "Total number of tenants",
        }),
    ],
    controllers: [AuthController, TenantController],
    exports: [PassportModule, JwtStrategy, JwtAuthGuard, JwtService],
})
export class AuthModule {}
