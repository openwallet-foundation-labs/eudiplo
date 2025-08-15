import { Module } from "@nestjs/common";
import * as Joi from "joi";
import { CryptoModule } from "../crypto/crypto.module";
import { OAuthController } from "./oauth.controller";
import { OAuthService } from "./oauth.service";

export const OAUTH_VALIDATION_SCHEMA = {
    OAUTH_CLIENT_ID: Joi.string().optional(),
    OAUTH_CLIENT_SECRET: Joi.string().optional(),
};

@Module({
    imports: [CryptoModule],
    controllers: [OAuthController],
    providers: [OAuthService],
    exports: [OAuthService],
})
export class OAuthModule {}
