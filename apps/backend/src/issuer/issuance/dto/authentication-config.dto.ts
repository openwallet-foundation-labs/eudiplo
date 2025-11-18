import { Type } from "class-transformer";
import {
    IsIn,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";

/**
 * Configuration for authentication method 'auth'
 * Used for OID4VCI authorized code flow where the user will be redirected for authentication
 */
export class AuthenticationUrlConfig {
    /**
     * The URL used in the OID4VCI authorized code flow.
     * This URL is where users will be redirected for authentication.
     */
    @IsString()
    url!: string;

    /**
     * Optional webhook configuration for authentication callbacks
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    webhook?: WebhookConfig;
}

/**
 * Configuration for authentication method 'presentationDuringIssuance'
 * Used for OID4VP flow where a credential presentation request is sent
 */
export class PresentationDuringIssuanceConfig {
    /**
     * Link to the presentation configuration that is relevant for the issuance process
     */
    @IsString()
    type!: string;
}

export class AuthenticationMethodPresentation
    implements AuthenticationMethodInterface
{
    @IsString()
    @IsIn(["presentationDuringIssuance"])
    method!: "presentationDuringIssuance";
    @IsObject()
    @ValidateNested()
    @Type(() => PresentationDuringIssuanceConfig)
    config!: PresentationDuringIssuanceConfig;
}

export class AuthenticationMethodAuth implements AuthenticationMethodInterface {
    @IsString()
    @IsIn(["auth"])
    method!: "auth";
    @IsObject()
    @ValidateNested()
    @Type(() => AuthenticationUrlConfig)
    config!: AuthenticationUrlConfig;
}

export class AuthenticationMethodNone implements AuthenticationMethodInterface {
    @IsString()
    @IsIn(["none"])
    method!: "none";
}

export interface AuthenticationMethodInterface {
    method: "none" | "auth" | "presentationDuringIssuance";
}

export enum AuthenticationMethod {
    NONE = "none",
    AUTH = "auth",
    PRESENTATION_DURING_ISSUANCE = "presentationDuringIssuance",
}
