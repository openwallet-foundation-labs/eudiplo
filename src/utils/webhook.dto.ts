import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class ApiKeyConfig {
    @IsString()
    headerName: string;
    @IsString()
    value: string;
}

export type AuthConfig = 'apiKey';

export class WebHookAuthConfig {
    @IsIn(['apiKey'])
    type: AuthConfig;
    @Type(() => ApiKeyConfig)
    @IsObject()
    config: ApiKeyConfig;
}

export class WebhookConfig {
    @IsString()
    url: string;
    @Type(() => WebHookAuthConfig)
    @IsOptional()
    @IsObject()
    auhth?: WebHookAuthConfig;
}
