import {
    IsArray,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AuthenticationConfigDto } from './authentication-config.dto';
import { WebhookConfig } from '../../../utils/webhook/webhook.dto';

/**
 * DTO for Issuance Configuration.
 */
export class IssuanceDto {
    /**
     * Unique identifier for the issuance configuration.
     */
    @IsString()
    id: string;

    /**
     * Ids of the credential configurations associated with this issuance configuration.
     */
    @IsString({ each: true })
    @IsArray()
    credentialConfigs: string[];

    /**
     * Authentication configuration for the issuance process.
     * This includes details like the authentication method and any required parameters.
     */
    @IsObject()
    @ValidateNested()
    @Type(() => AuthenticationConfigDto)
    authenticationConfig: AuthenticationConfigDto;

    /**
     * Optional webhook configuration to send the results of the notification response.
     */
    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    webhook?: WebhookConfig;
}
