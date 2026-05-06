import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";

/**
 * Attestation Level of Security (LoS) as defined in TS11.
 */
export enum AttestationLoS {
    HIGH = "iso_18045_high",
    MODERATE = "iso_18045_moderate",
    ENHANCED_BASIC = "iso_18045_enhanced-basic",
    BASIC = "iso_18045_basic",
}

/**
 * Cryptographic binding type as defined in TS11.
 */
export enum SchemaMetaBindingType {
    CLAIM = "claim",
    KEY = "key",
    BIOMETRIC = "biometric",
    NONE = "none",
}

/**
 * Trust framework type for trusted authorities.
 */
export enum SchemaMetaFrameworkType {
    AKI = "aki",
    ETSI_TL = "etsi_tl",
    OPENID_FEDERATION = "openid_federation",
}

/**
 * Schema URI entry per attestation format.
 */
export class SchemaUriEntry {
    @ApiPropertyOptional({
        description:
            "Attestation format this schema URI applies to (e.g. dc+sd-jwt, mso_mdoc)",
        example: "dc+sd-jwt",
    })
    @IsString()
    format!: string;

    @ApiPropertyOptional({
        description: "URI pointing to the schema document for this format",
    })
    @IsString()
    uri!: string;
}

/**
 * Trust authority entry for TS11 SchemaMeta.
 */
export class TrustAuthorityEntry {
    @ApiPropertyOptional({
        enum: SchemaMetaFrameworkType,
        description: "Trust framework type",
    })
    @IsEnum(SchemaMetaFrameworkType)
    frameworkType!: SchemaMetaFrameworkType;

    @ApiPropertyOptional({
        description: "URI of the trust list or trust anchor",
    })
    @IsString()
    value!: string;

    @ApiPropertyOptional({
        description:
            "Whether this trust authority is a List of Trusted Entities (LoTE)",
    })
    @IsOptional()
    @IsBoolean()
    isLoTE?: boolean;
}

/**
 * TS11-specific configuration for schema metadata generation.
 *
 * When present on a CredentialConfig, EUDIPLO can generate a SchemaMeta
 * object per the EUDI Catalogue of Attestations specification (TS11).
 *
 * @see https://github.com/eu-digital-identity-wallet/eudi-doc-standards-and-technical-specifications/blob/main/docs/technical-specifications/ts11-interfaces-and-formats-for-catalogue-of-attributes-and-catalogue-of-schemes.md
 *
 * @experimental The underlying TS11 specification is not yet finalized.
 */
export class SchemaMetaConfig {
    @ApiPropertyOptional({
        description:
            "Optional override for the schema ID (attestation identifier URI). " +
            "When not set, derived from vct (dc+sd-jwt) or docType (mso_mdoc).",
        example: "https://example.com/attestations/my-credential",
    })
    @IsOptional()
    @IsString()
    id?: string;

    @ApiPropertyOptional({
        description: "Schema version in SemVer format",
        example: "1.0.0",
    })
    @IsString()
    version!: string;

    @ApiPropertyOptional({
        description: "URI of the Attestation Rulebook",
        example: "https://example.com/rulebooks/my-credential/1.0.0.md",
    })
    @IsString()
    rulebookURI!: string;

    @ApiPropertyOptional({
        enum: AttestationLoS,
        description: "Attestation Level of Security",
    })
    @IsEnum(AttestationLoS)
    attestationLoS!: AttestationLoS;

    @ApiPropertyOptional({
        enum: SchemaMetaBindingType,
        description: "Cryptographic binding type",
    })
    @IsEnum(SchemaMetaBindingType)
    bindingType!: SchemaMetaBindingType;

    @ApiPropertyOptional({
        type: () => [SchemaUriEntry],
        description:
            "Schema URIs per attestation format. " +
            "When omitted, the format is derived from the credential config format field.",
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => SchemaUriEntry)
    schemaURIs?: SchemaUriEntry[];

    @ApiPropertyOptional({
        type: () => [TrustAuthorityEntry],
        description: "Trust authorities for this attestation schema",
    })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => TrustAuthorityEntry)
    trustedAuthorities?: TrustAuthorityEntry[];
}

/**
 * Request body for the sign-and-submit schema metadata endpoint.
 */
export class SignSchemaMetaConfigDto {
    @ApiProperty({
        type: () => SchemaMetaConfig,
        description: "The schema metadata configuration to sign and submit",
    })
    @ValidateNested()
    @Type(() => SchemaMetaConfig)
    config!: SchemaMetaConfig;

    @ApiPropertyOptional({
        description:
            "ID of the key chain to use for signing. Defaults to the tenant's default key chain.",
    })
    @IsOptional()
    @IsString()
    keyChainId?: string;

    @ApiPropertyOptional({
        description:
            "ID of the credential config to link back after submission. " +
            "When provided, schemaMeta.id on the credential config is updated with the reserved attestation ID.",
    })
    @IsOptional()
    @IsString()
    credentialConfigId?: string;
}

/**
 * Request body for the sign-and-submit new version endpoint.
 */
export class SignVersionSchemaMetaConfigDto {
    @ApiProperty({
        type: () => SchemaMetaConfig,
        description:
            "The schema metadata configuration to sign and submit as a new version. Must include the existing id.",
    })
    @ValidateNested()
    @Type(() => SchemaMetaConfig)
    config!: SchemaMetaConfig;

    @ApiPropertyOptional({
        description:
            "ID of the key chain to use for signing. Defaults to the tenant's default key chain.",
    })
    @IsOptional()
    @IsString()
    keyChainId?: string;
}
