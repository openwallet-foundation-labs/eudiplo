import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsEnum,
    IsIn,
    IsObject,
    IsString,
    ValidateNested,
} from "class-validator";

/**
 * Configuration for API key authentication in webhooks.
 */
export class ApiKeyConfig {
    /**
     * The name of the header where the API key will be sent.
     */
    @IsString()
    headerName!: string;
    /**
     * The value of the API key to be sent in the header.
     */
    @IsString()
    value!: string;
}

/**
 * Enum for the type of authentication used in webhooks.
 */
export enum AuthConfig {
    API_KEY = "apiKey",
    NONE = "none",
}

/**
 * Configuration for webhook authentication.
 */
export class WebHookAuthConfigHeader implements WebHookAuthConfig {
    /**
     * The type of authentication used for the webhook.
     */
    @IsIn([AuthConfig.API_KEY])
    @IsString()
    type!: AuthConfig.API_KEY;
    /**
     * Configuration for API key authentication.
     * This is required if the type is 'apiKey'.
     */
    @Type(() => ApiKeyConfig)
    @IsObject()
    config!: ApiKeyConfig;
}

export class WebHookAuthConfigNone implements WebHookAuthConfig {
    /**
     * The type of authentication used for the webhook.
     */
    @IsIn([AuthConfig.NONE])
    @IsString()
    type!: AuthConfig.NONE;
}

export class WebHookAuthConfig {
    @IsEnum(AuthConfig)
    type!: AuthConfig;
}

/**
 * Configuration for webhooks used in various services.
 */
@ApiExtraModels(WebHookAuthConfigNone, WebHookAuthConfigHeader)
export class WebhookConfig {
    /**
     * The URL to which the webhook will send notifications.
     */
    @IsString()
    url!: string;
    /**
     * Optional authentication configuration for the webhook.
     * If not provided, no authentication will be used.
     */
    @ValidateNested()
    @ApiProperty({
        oneOf: [
            { $ref: getSchemaPath(WebHookAuthConfigNone) },
            { $ref: getSchemaPath(WebHookAuthConfigHeader) },
        ],
    })
    @Type(() => WebHookAuthConfig, {
        discriminator: {
            property: "type",
            subTypes: [
                {
                    name: AuthConfig.NONE,
                    value: WebHookAuthConfigNone,
                },
                {
                    name: AuthConfig.API_KEY,
                    value: WebHookAuthConfigHeader,
                },
            ],
        },
        keepDiscriminatorProperty: true,
    })
    @IsObject()
    auth!: WebHookAuthConfigNone | WebHookAuthConfigHeader;
}
