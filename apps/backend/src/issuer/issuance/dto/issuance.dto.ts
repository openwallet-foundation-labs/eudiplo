import { Type } from "class-transformer";
import {
    IsArray,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";
import { AuthenticationConfigDto } from "./authentication-config.dto";

/**
 * DTO for mapping credential configurations in issuance.
 */
export class CredentialConfigMapping {
    /**
     * Unique identifier for the credential configuration.
     */
    @IsString()
    id: string;
}

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
     * Description of the issuance configuration.
     */
    @IsString()
    @IsOptional()
    description?: string;

    /**
     * Ids of the credential configurations associated with this issuance configuration.
     */
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CredentialConfigMapping)
    credentialConfigs: CredentialConfigMapping[];

    /**
     * Authentication configuration for the issuance process.
     * This includes details like the authentication method and any required parameters.
     */
    @IsObject()
    @ValidateNested()
    @Type(() => AuthenticationConfigDto)
    authenticationConfig: AuthenticationConfigDto;

    /**
     * Optional webhook configuration to receive claims during the issuance process.
     */
    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    claimWebhook?: WebhookConfig;

    /**
     * Optional webhook configuration to send the results of the notification response.
     */
    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    notifyWebhook?: WebhookConfig;

    /**
     * Value to determine the amount of credentials that are issued in a batch.
     * Default is 1.
     */
    @IsNumber()
    @IsOptional()
    batch_size?: number;
}
