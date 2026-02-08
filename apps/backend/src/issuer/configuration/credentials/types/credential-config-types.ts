/**
 * Utility types and helpers for working with credential configurations.
 * Re-exports and extends types from @openid4vc/openid4vci for type-safe
 * credential configuration building.
 */

import type {
    CredentialConfigurationSupported,
    CredentialConfigurationSupportedWithFormats,
    MsoMdocFormatIdentifier,
} from "@openid4vc/openid4vci";

/**
 * Format identifier constants for runtime checks
 */
export const MSO_MDOC_FORMAT: MsoMdocFormatIdentifier = "mso_mdoc";
export const SD_JWT_DC_FORMAT = "dc+sd-jwt" as const;

export type SdJwtDcFormatIdentifier = typeof SD_JWT_DC_FORMAT;

/**
 * Extract mso_mdoc specific configuration from the SDK union type
 */
export type MsoMdocCredentialConfig = Extract<
    CredentialConfigurationSupportedWithFormats,
    { format: MsoMdocFormatIdentifier }
>;

/**
 * Extract dc+sd-jwt specific configuration from the SDK union type
 */
export type SdJwtDcCredentialConfig = Extract<
    CredentialConfigurationSupportedWithFormats,
    { format: SdJwtDcFormatIdentifier }
>;

/**
 * Union of the credential configs we actively support
 */
export type TypedCredentialConfig =
    | SdJwtDcCredentialConfig
    | MsoMdocCredentialConfig;

/**
 * Type guard to check if a config is for mso_mdoc format
 */
export function isMsoMdocConfig(
    config:
        | CredentialConfigurationSupported
        | CredentialConfigurationSupportedWithFormats,
): config is MsoMdocCredentialConfig {
    return config.format === MSO_MDOC_FORMAT;
}

/**
 * Type guard to check if a config is for dc+sd-jwt format
 */
export function isSdJwtDcConfig(
    config:
        | CredentialConfigurationSupported
        | CredentialConfigurationSupportedWithFormats,
): config is SdJwtDcCredentialConfig {
    return config.format === SD_JWT_DC_FORMAT;
}

/**
 * Options for building credential configuration
 */
export interface BuildCredentialConfigOptions {
    /** Supported signing algorithms for the format */
    signingAlgorithms: string[] | number[];
    /** Cryptographic binding methods (e.g., "jwk", "cose_key") */
    bindingMethods: string[];
    /** Proof types supported configuration */
    proofTypesSupported: MsoMdocCredentialConfig["proof_types_supported"];
}

/**
 * Credential metadata input - accepts display array
 * Using a more permissive type to allow entity Display[] to be passed
 */
export interface CredentialMetadataInput {
    display?: Array<{
        name: string;
        locale?: string;
        logo?: { uri?: string; alt_text?: string };
        description?: string;
        background_color?: string;
        background_image?: { uri?: string };
        text_color?: string;
    }>;
}

/**
 * Build an mso_mdoc credential configuration
 */
export function buildMsoMdocConfig(
    doctype: string,
    options: BuildCredentialConfigOptions,
    metadata?: CredentialMetadataInput,
    scope?: string,
): MsoMdocCredentialConfig {
    return {
        format: MSO_MDOC_FORMAT,
        doctype,
        credential_signing_alg_values_supported:
            options.signingAlgorithms as number[],
        cryptographic_binding_methods_supported: options.bindingMethods,
        proof_types_supported: options.proofTypesSupported,
        ...(metadata && { credential_metadata: metadata }),
        ...(scope && { scope }),
    } as MsoMdocCredentialConfig;
}

/**
 * Build a dc+sd-jwt credential configuration
 */
export function buildSdJwtDcConfig(
    vct: string,
    options: BuildCredentialConfigOptions,
    metadata?: CredentialMetadataInput,
    scope?: string,
): SdJwtDcCredentialConfig {
    return {
        format: SD_JWT_DC_FORMAT,
        vct,
        credential_signing_alg_values_supported:
            options.signingAlgorithms as string[],
        cryptographic_binding_methods_supported: options.bindingMethods,
        proof_types_supported: options.proofTypesSupported,
        ...(metadata && { credential_metadata: metadata }),
        ...(scope && { scope }),
    } as SdJwtDcCredentialConfig;
}

/**
 * Converts a TypedCredentialConfig to CredentialConfigurationSupported
 * This is a type assertion helper since our types are derived from the SDK
 */
export function toCredentialConfigurationSupported(
    config: TypedCredentialConfig,
): CredentialConfigurationSupportedWithFormats {
    return config;
}
