import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import * as Joi from "joi";
import { CryptoModule } from "../crypto/crypto.module";
import { PresentationsModule } from "../verifier/presentations/presentations.module";
import { RegistrarEntity } from "./entities/registrar.entity";
import { RegistrarService } from "./registrar.service";

/**
 * Validation schema for the registrar module.
 * Defines the required environment variables and their types.
 */
export const REGISTRAR_VALIDATION_SCHEMA = {
    REGISTRAR_URL: Joi.string(),
    REGISTRAR_OIDC_URL: Joi.string().when("REGISTRAR_URL", {
        is: Joi.exist(),
        then: Joi.required(),
    }),
    REGISTRAR_OIDC_CLIENT_ID: Joi.string().when("REGISTRAR_URL", {
        is: Joi.exist(),
        then: Joi.required(),
    }),
    REGISTRAR_OIDC_CLIENT_SECRET: Joi.string().when("REGISTRAR_URL", {
        is: Joi.exist(),
        then: Joi.required(),
    }),
};

/**
 * RegistrarModule is responsible for managing the registrar service.
 * It provides the RegistrarService and imports necessary modules.
 */
@Module({
    imports: [
        CryptoModule,
        PresentationsModule,
        TypeOrmModule.forFeature([RegistrarEntity]),
    ],
    providers: [RegistrarService],
    exports: [RegistrarService],
})
export class RegistrarModule {}
