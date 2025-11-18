import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsEnum,
    IsObject,
    IsOptional,
    ValidateNested,
} from "class-validator";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";
import { ResponseType } from "../../../verifier/oid4vp/dto/presentation-request.dto";

export enum FlowType {
    AUTH_CODE = "authorization_code",
    PRE_AUTH_CODE = "pre_authorized_code",
}

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
    response_type!: ResponseType;

    @IsEnum(FlowType)
    flow!: FlowType;

    /**
     * List of credential configuration ids to be included in the offer.
     */
    @IsArray()
    credentialConfigurationIds!: string[];

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
     * Webhooks to fetch the claims dynamically.
     */
    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    claimWebhook?: WebhookConfig;

    /**
     * Webhook to notify about the status of the issuance process.
     */
    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    notifyWebhook?: WebhookConfig;
}

export class OfferResponse {
    uri!: string;
    session!: string;
}
