import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Configuration for API key authentication in webhooks.
 */
export class ApiKeyConfig {
    /**
     * The name of the header where the API key will be sent.
     * @example Authorization
     */
    @IsString()
    headerName: string;
    /**
     * The value of the API key to be sent in the header.
     * @example Bearer your_api_key_here
     */
    @IsString()
    value: string;
}

/**
 * Enum for the type of authentication used in webhooks.
 */
export type AuthConfig = 'apiKey';

/**
 * Configuration for webhook authentication.
 */
export class WebHookAuthConfig {
    /**
     * The type of authentication used for the webhook.
     * Currently, only 'apiKey' is supported.
     */
    @IsIn(['apiKey'])
    type: AuthConfig;
    /**
     * Configuration for API key authentication.
     * This is required if the type is 'apiKey'.
     */
    @Type(() => ApiKeyConfig)
    @IsObject()
    config: ApiKeyConfig;
}

/**
 * Configuration for webhooks used in various services.
 */
export class WebhookConfig {
    /**
     * The URL to which the webhook will send notifications.
     */
    @IsString()
    url: string;
    /**
     * Optional authentication configuration for the webhook.
     * If not provided, no authentication will be used.
     */
    @Type(() => WebHookAuthConfig)
    @IsOptional()
    @IsObject()
    auth?: WebHookAuthConfig;
}
