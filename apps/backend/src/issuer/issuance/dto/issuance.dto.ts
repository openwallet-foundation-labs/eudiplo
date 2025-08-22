import { OmitType } from "@nestjs/swagger";
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
import { IssuanceConfig } from "../entities/issuance-config.entity";
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
 * DTO for mapping issuance configurations.
 */
export class IssuanceDto extends OmitType(IssuanceConfig, [
    "tenantId",
    "credentialIssuanceBindings",
    "createdAt",
    "updatedAt",
] as const) {
    /**
     * Ids of the credential configurations associated with this issuance configuration.
     */
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CredentialConfigMapping)
    credentialConfigs: CredentialConfigMapping[];
}
