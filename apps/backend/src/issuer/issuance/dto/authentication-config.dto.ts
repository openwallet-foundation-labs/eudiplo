import { Type } from 'class-transformer';
import {
    IsIn,
    IsObject,
    IsOptional,
    IsUrl,
    Validate,
    ValidateNested,
    ValidationArguments,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { WebhookConfig } from '../../../utils/webhook/webhook.dto';
import { PresentationDuringIssuance } from '../../credentials-metadata/dto/credential-config.dto';

/**
 * Custom validator to ensure config type matches the authentication method
 */
@ValidatorConstraint({ name: 'authConfigValidator', async: false })
export class AuthConfigValidator implements ValidatorConstraintInterface {
    validate(config: any, args: ValidationArguments) {
        const obj = args.object as AuthenticationConfigDto;

        if (obj.method === 'none') {
            // For 'none' method, config should be undefined
            return config === undefined;
        }

        if (obj.method === 'auth') {
            // For 'auth' method, config must be present and have 'url' property
            return (
                config &&
                typeof config === 'object' &&
                typeof config.url === 'string'
            );
        }

        if (obj.method === 'presentationDuringIssuance') {
            // For 'presentationDuringIssuance' method, config must be present and have 'presentation' property
            return config && typeof config === 'object' && config.presentation;
        }

        return false;
    }

    defaultMessage(args: ValidationArguments) {
        const obj = args.object as AuthenticationConfigDto;

        if (obj.method === 'none') {
            return 'config must be undefined when method is "none"';
        }

        if (obj.method === 'auth') {
            return 'config must be of type AuthenticationUrlConfig when method is "auth"';
        }

        if (obj.method === 'presentationDuringIssuance') {
            return 'config must be of type PresentationDuringIssuanceConfig when method is "presentationDuringIssuance"';
        }

        return 'config type does not match the specified method';
    }
}

/**
 * Configuration for authentication method 'auth'
 * Used for OID4VCI authorized code flow where the user will be redirected for authentication
 */
export class AuthenticationUrlConfig {
    /**
     * The URL used in the OID4VCI authorized code flow.
     * This URL is where users will be redirected for authentication.
     */
    @IsUrl()
    url: string;

    /**
     * Optional webhook configuration for authentication callbacks
     */
    @IsObject()
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    webhook?: WebhookConfig;
}

/**
 * Configuration for authentication method 'presentationDuringIssuance'
 * Used for OID4VP flow where a credential presentation request is sent
 */
export class PresentationDuringIssuanceConfig {
    /**
     * Presentation configuration that specifies what credentials need to be presented via OID4VP
     */
    @IsObject()
    @ValidateNested()
    @Type(() => PresentationDuringIssuance)
    presentation: PresentationDuringIssuance;
}

/**
 * Base class for authentication configurations
 * Determines which OpenID4VC flow to use for the issuance process
 */
export class AuthenticationConfigDto {
    /**
     * The authentication method to use:
     * - 'none': Pre-authorized code flow (no user authentication)
     * - 'auth': OID4VCI authorized code flow (user redirect for authentication)
     * - 'presentationDuringIssuance': OID4VP flow (credential presentation required)
     */
    @IsIn(['none', 'auth', 'presentationDuringIssuance'])
    method: 'none' | 'auth' | 'presentationDuringIssuance';

    /**
     * Configuration specific to the selected authentication method
     * - For 'none': no config needed (undefined) - uses pre-authorized code flow
     * - For 'auth': AuthenticationUrlConfig - for OID4VCI authorized code flow
     * - For 'presentationDuringIssuance': PresentationDuringIssuanceConfig - for OID4VP flow
     */
    @IsOptional()
    @Validate(AuthConfigValidator)
    config?: AuthenticationUrlConfig | PresentationDuringIssuanceConfig;
}

/**
 * Union type for authentication configurations
 * Each method corresponds to a specific OpenID4VC flow
 */
export type AuthenticationConfig =
    | { method: 'none' } // Pre-authorized code flow
    | { method: 'auth'; config: AuthenticationUrlConfig } // OID4VCI authorized code flow
    | {
          method: 'presentationDuringIssuance'; // OID4VP flow
          config: PresentationDuringIssuanceConfig;
      };
