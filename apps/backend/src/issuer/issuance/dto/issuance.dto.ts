import { OmitType } from "@nestjs/swagger";
import { IsArray, IsString } from "class-validator";
import { IssuanceConfig } from "../entities/issuance-config.entity";

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
    "tenant",
    "createdAt",
    "updatedAt",
    "credentialConfigs",
] as const) {
    /**
     * Ids of the credential configurations associated with this issuance configuration.
     */
    @IsArray()
    credentialConfigIds: string[];
}
