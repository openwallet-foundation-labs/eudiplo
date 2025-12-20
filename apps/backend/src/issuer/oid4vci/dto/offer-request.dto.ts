import { ApiProperty } from "@nestjs/swagger";
import { plainToClass, Transform, Type } from "class-transformer";
import {
    IsArray,
    IsEnum,
    IsIn,
    IsObject,
    IsOptional,
    IsString,
    Validate,
    ValidateNested,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from "class-validator";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";
import { ResponseType } from "../../../verifier/oid4vp/dto/presentation-request.dto";

export enum FlowType {
    AUTH_CODE = "authorization_code",
    PRE_AUTH_CODE = "pre_authorized_code",
}

/**
 * Inline claims source - claims provided directly in the request.
 */
export class InlineClaimsSource {
    @IsIn(["inline"])
    type!: "inline";

    @IsObject()
    claims!: Record<string, any>;
}

/**
 * Webhook claims source - claims fetched dynamically via webhook.
 */
export class WebhookClaimsSource {
    @IsIn(["webhook"])
    type!: "webhook";

    @ValidateNested()
    @Type(() => WebhookConfig)
    webhook!: WebhookConfig;
}

/**
 * Custom validator to ensure credentialClaims keys are subset of credentialConfigurationIds
 */
@ValidatorConstraint({ name: "credentialClaimsMatchIds", async: false })
export class CredentialClaimsMatchIdsConstraint
    implements ValidatorConstraintInterface
{
    validate(
        credentialClaims: Record<string, any> | undefined,
        args: ValidationArguments,
    ) {
        if (!credentialClaims) return true; // Optional field

        const object = args.object as OfferRequestDto;
        const credentialConfigurationIds = object.credentialConfigurationIds;

        if (
            !credentialConfigurationIds ||
            !Array.isArray(credentialConfigurationIds)
        ) {
            return false;
        }

        // Check that all keys in credentialClaims exist in credentialConfigurationIds
        const claimsKeys = Object.keys(credentialClaims);
        return claimsKeys.every((key) =>
            credentialConfigurationIds.includes(key),
        );
    }

    defaultMessage(args: ValidationArguments) {
        const object = args.object as OfferRequestDto;
        const credentialClaims = args.value as Record<string, any>;
        const credentialConfigurationIds =
            object.credentialConfigurationIds || [];

        const claimsKeys = Object.keys(credentialClaims || {});
        const invalidKeys = claimsKeys.filter(
            (key) => !credentialConfigurationIds.includes(key),
        );

        return `credentialClaims contains keys [${invalidKeys.join(", ")}] that are not in credentialConfigurationIds [${credentialConfigurationIds.join(", ")}]`;
    }
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

    /**
     * The flow type for the offer request.
     */
    @IsEnum(FlowType)
    flow!: FlowType;

    /**
     * Transaction code for pre-authorized code flow.
     */
    @IsString()
    @IsOptional()
    tx_code?: string;

    /**
     * List of credential configuration ids to be included in the offer.
     */
    @IsArray()
    credentialConfigurationIds!: string[];

    /**
     * Credential claims configuration per credential.
     * Each credential can have claims provided inline or fetched via webhook.
     * Keys must be a subset of credentialConfigurationIds.
     */
    @ApiProperty({
        description:
            "Credential claims configuration per credential. Keys must match credentialConfigurationIds.",
        type: "object",
        properties: {
            additionalProperties: {
                oneOf: [
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["inline"] },
                            claims: {
                                type: "object",
                                additionalProperties: true,
                            },
                        },
                        required: ["type", "claims"],
                    },
                    {
                        type: "object",
                        properties: {
                            type: { type: "string", enum: ["webhook"] },
                            webhook: { type: "object" },
                        },
                        required: ["type", "webhook"],
                    },
                ],
            },
        },
        example: {
            citizen: {
                type: "inline",
                claims: { given_name: "John", family_name: "Doe" },
            },
        },
    })
    @IsObject()
    @IsOptional()
    @Validate(CredentialClaimsMatchIdsConstraint)
    @Transform(({ value }) => {
        if (!value) return value;
        const result: Record<string, InlineClaimsSource | WebhookClaimsSource> =
            {};
        for (const [key, val] of Object.entries(value)) {
            const source = val as any;
            if (source.type === "inline") {
                result[key] = plainToClass(InlineClaimsSource, val, {
                    enableImplicitConversion: true,
                });
            } else if (source.type === "webhook") {
                result[key] = plainToClass(WebhookClaimsSource, val, {
                    enableImplicitConversion: true,
                });
            }
        }
        return result;
    })
    credentialClaims?: Record<string, InlineClaimsSource | WebhookClaimsSource>;

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
