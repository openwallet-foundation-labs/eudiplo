import { ApiProperty } from "@nestjs/swagger";
import {
    IsArray,
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
} from "class-validator";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";
import { ResponseType } from "../../../verifier/oid4vp/dto/presentation-request.dto";

export class OfferRequestDto {
    @ApiProperty({
        examples: [
            {
                value: "qrcode",
            },
        ],
        description: "The type of response expected for the offer request.",
    })
    @IsEnum(ResponseType)
    response_type: ResponseType;

    /**
     * Issuance config id to reference the issuance configuration.
     */
    @IsString()
    issuanceId: string;

    /**
     * Overrides the default values for the credential ids.
     */
    @IsArray()
    @IsOptional()
    credentialConfigurationIds?: string[];

    /**
     * Override the default values for the credential claims.
     */
    @ApiProperty({
        type: "object",
        description: "Override the default values for the credential claims.",
        properties: {},
        examples: [
            {
                pid: {
                    given_name: "ERIKA",
                    family_name: "MUSTERMANN",
                },
            },
        ],
    })
    @IsObject()
    @IsOptional()
    claims?: Record<string, Record<string, any>>;

    /**
     * Webhook configuration for claims
     */
    @IsObject()
    @IsOptional()
    claimsWebhook?: WebhookConfig;

    /**
     * Pre defined session id
     */
    @IsUUID()
    @IsOptional()
    session?: string;
}

export class OfferResponse {
    uri: string;
    session: string;
}
