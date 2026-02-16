import {
    ApiProperty,
    ApiPropertyOptional,
    getSchemaPath,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsEnum,
    IsOptional,
    IsString,
    IsUrl,
    ValidateNested,
} from "class-validator";

/**
 * Discriminator for IAE action types.
 */
export enum IaeActionType {
    /**
     * Request a verifiable presentation via OpenID4VP.
     */
    OPENID4VP_PRESENTATION = "openid4vp_presentation",
    /**
     * Redirect to a web page for user interaction (e.g., form entry, payment).
     */
    REDIRECT_TO_WEB = "redirect_to_web",
}

/**
 * Base class for IAE actions.
 */
export abstract class IaeActionBase {
    @ApiProperty({
        description: "Type of the IAE action",
        enum: IaeActionType,
    })
    @IsEnum(IaeActionType)
    type!: IaeActionType;

    @ApiPropertyOptional({
        description: "Optional label for this step (for display purposes)",
        example: "Identity Verification",
    })
    @IsOptional()
    @IsString()
    label?: string;
}

/**
 * IAE action for requesting a verifiable presentation via OpenID4VP.
 */
export class IaeActionOpenid4vpPresentation extends IaeActionBase {
    @ApiProperty({
        description: "Action type discriminator",
        enum: [IaeActionType.OPENID4VP_PRESENTATION],
        example: IaeActionType.OPENID4VP_PRESENTATION,
    })
    @IsEnum(IaeActionType)
    declare type: IaeActionType.OPENID4VP_PRESENTATION;

    @ApiProperty({
        description:
            "ID of the presentation configuration to use for this step",
        example: "pid-presentation-config",
    })
    @IsString()
    presentationConfigId!: string;
}

/**
 * IAE action for redirecting to a web page.
 */
export class IaeActionRedirectToWeb extends IaeActionBase {
    @ApiProperty({
        description: "Action type discriminator",
        enum: [IaeActionType.REDIRECT_TO_WEB],
        example: IaeActionType.REDIRECT_TO_WEB,
    })
    @IsEnum(IaeActionType)
    declare type: IaeActionType.REDIRECT_TO_WEB;

    @ApiProperty({
        description: "URL to redirect the user to for web-based interaction",
        example: "https://example.com/verify?session={auth_session}",
    })
    @IsUrl({}, { message: "url must be a valid URL" })
    url!: string;

    @ApiPropertyOptional({
        description:
            "URL where the external service should redirect back after completion. " +
            "If not provided, the service must call back to the IAE endpoint.",
        example:
            "https://issuer.example.com/{tenantId}/authorize/interactive/callback",
    })
    @IsOptional()
    @IsUrl({}, { message: "callbackUrl must be a valid URL" })
    callbackUrl?: string;

    @ApiPropertyOptional({
        description:
            "Description of what the user should do on the web page (for wallet display)",
        example: "Please complete the identity verification form",
    })
    @IsOptional()
    @IsString()
    description?: string;
}

/**
 * Union type for all IAE actions.
 * This is a discriminated union based on the `type` field.
 */
export type IaeAction = IaeActionOpenid4vpPresentation | IaeActionRedirectToWeb;

/**
 * Array validator class for IAE actions with class-transformer support.
 */
export class IaeActionsWrapper {
    @ApiProperty({
        description: "List of IAE actions to execute in order",
        type: "array",
        items: {
            oneOf: [
                { $ref: getSchemaPath(IaeActionOpenid4vpPresentation) },
                { $ref: getSchemaPath(IaeActionRedirectToWeb) },
            ],
        },
    })
    @ValidateNested({ each: true })
    @Type(() => IaeActionBase, {
        discriminator: {
            property: "type",
            subTypes: [
                {
                    name: IaeActionType.OPENID4VP_PRESENTATION,
                    value: IaeActionOpenid4vpPresentation,
                },
                {
                    name: IaeActionType.REDIRECT_TO_WEB,
                    value: IaeActionRedirectToWeb,
                },
            ],
        },
        keepDiscriminatorProperty: true,
    })
    actions!: IaeAction[];
}

/**
 * Helper function to validate and transform IAE actions array.
 */
export function transformIaeActions(): ReturnType<typeof Type> {
    return Type(() => IaeActionBase, {
        discriminator: {
            property: "type",
            subTypes: [
                {
                    name: IaeActionType.OPENID4VP_PRESENTATION,
                    value: IaeActionOpenid4vpPresentation,
                },
                {
                    name: IaeActionType.REDIRECT_TO_WEB,
                    value: IaeActionRedirectToWeb,
                },
            ],
        },
        keepDiscriminatorProperty: true,
    });
}
