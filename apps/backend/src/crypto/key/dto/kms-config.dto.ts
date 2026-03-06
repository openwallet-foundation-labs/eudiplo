import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";

/**
 * Supported KMS adapter types.
 */
export const KMS_PROVIDER_TYPES = ["db", "vault", "aws-kms"] as const;
export type KmsProviderType = (typeof KMS_PROVIDER_TYPES)[number];

/**
 * Base configuration for all KMS providers.
 * Each provider must have a unique id and a type.
 */
export class BaseKmsProviderConfigDto {
    @ApiProperty({
        description:
            "Unique identifier for this provider instance. Used when generating keys to specify which provider to use.",
        example: "main-vault",
    })
    @IsString()
    @IsNotEmpty()
    id!: string;

    @ApiProperty({
        description:
            "Type of the KMS provider. Must match a supported adapter type.",
        enum: KMS_PROVIDER_TYPES,
        example: "vault",
    })
    @IsString()
    @IsIn(KMS_PROVIDER_TYPES)
    type!: KmsProviderType;

    @ApiPropertyOptional({
        description: "Human-readable description of this provider instance.",
        example: "Production HashiCorp Vault for signing keys",
    })
    @IsString()
    @IsOptional()
    description?: string;
}

/**
 * Configuration for the DB KMS provider.
 * No additional configuration required — keys are stored in the database.
 */
export class DbKmsConfigDto extends BaseKmsProviderConfigDto {
    @ApiProperty({
        description: "Type of the KMS provider.",
        enum: ["db"],
        example: "db",
    })
    @IsIn(["db"])
    declare type: "db";
}

/**
 * Configuration for the HashiCorp Vault KMS provider.
 */
export class VaultKmsConfigDto extends BaseKmsProviderConfigDto {
    @ApiProperty({
        description: "Type of the KMS provider.",
        enum: ["vault"],
        example: "vault",
    })
    @IsIn(["vault"])
    declare type: "vault";

    @ApiProperty({
        description:
            "URL of the HashiCorp Vault instance. Supports ${ENV_VAR} placeholders.",
        example: "${VAULT_URL}",
    })
    @IsString()
    @IsNotEmpty()
    vaultUrl!: string;

    @ApiProperty({
        description:
            "Authentication token for HashiCorp Vault. Supports ${ENV_VAR} placeholders.",
        example: "${VAULT_TOKEN}",
    })
    @IsString()
    @IsNotEmpty()
    vaultToken!: string;
}

/**
 * Configuration for the AWS KMS provider.
 * Uses AWS SDK credential chain if credentials are not provided.
 */
export class AwsKmsConfigDto extends BaseKmsProviderConfigDto {
    @ApiProperty({
        description: "Type of the KMS provider.",
        enum: ["aws-kms"],
        example: "aws-kms",
    })
    @IsIn(["aws-kms"])
    declare type: "aws-kms";

    @ApiProperty({
        description: "AWS region for KMS. Supports ${ENV_VAR} placeholders.",
        example: "${AWS_REGION}",
    })
    @IsString()
    @IsNotEmpty()
    region!: string;

    @ApiPropertyOptional({
        description:
            "AWS access key ID. Optional — uses SDK credential chain if not provided. Supports ${ENV_VAR} placeholders.",
        example: "${AWS_ACCESS_KEY_ID}",
    })
    @IsString()
    @IsOptional()
    accessKeyId?: string;

    @ApiPropertyOptional({
        description:
            "AWS secret access key. Optional — uses SDK credential chain if not provided. Supports ${ENV_VAR} placeholders.",
        example: "${AWS_SECRET_ACCESS_KEY}",
    })
    @IsString()
    @IsOptional()
    secretAccessKey?: string;
}

/**
 * Union type for all provider configurations.
 */
export type KmsProviderConfigDto =
    | DbKmsConfigDto
    | VaultKmsConfigDto
    | AwsKmsConfigDto;

/**
 * Root DTO for kms.json.
 *
 * Providers are configured as an array of provider instances.
 * Each provider has a unique `id` that can be referenced when generating keys,
 * a `type` that determines which adapter to use, and optional `description`.
 *
 * Example:
 * ```json
 * {
 *   "defaultProvider": "main-vault",
 *   "providers": [
 *     { "id": "db", "type": "db", "description": "Default database provider" },
 *     { "id": "main-vault", "type": "vault", "description": "Production Vault", "vaultUrl": "${VAULT_URL}", "vaultToken": "${VAULT_TOKEN}" },
 *     { "id": "backup-vault", "type": "vault", "description": "Backup Vault", "vaultUrl": "${BACKUP_VAULT_URL}", "vaultToken": "${BACKUP_VAULT_TOKEN}" },
 *     { "id": "aws", "type": "aws-kms", "description": "AWS KMS", "region": "${AWS_REGION}" }
 *   ]
 * }
 * ```
 */
export class KmsConfigDto {
    @ApiPropertyOptional({
        description:
            'ID of the default KMS provider. Defaults to "db" if not set.',
        example: "main-vault",
    })
    @IsString()
    @IsOptional()
    defaultProvider?: string;

    @ApiProperty({
        description:
            "List of KMS provider configurations. Each provider must have a unique id and a type.",
        type: [BaseKmsProviderConfigDto],
        example: [
            { id: "db", type: "db", description: "Default database provider" },
            {
                id: "main-vault",
                type: "vault",
                description: "Production Vault",
                vaultUrl: "${VAULT_URL}",
                vaultToken: "${VAULT_TOKEN}",
            },
            {
                id: "aws",
                type: "aws-kms",
                description: "AWS KMS",
                region: "${AWS_REGION}",
            },
        ],
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BaseKmsProviderConfigDto, {
        discriminator: {
            property: "type",
            subTypes: [
                { value: DbKmsConfigDto, name: "db" },
                { value: VaultKmsConfigDto, name: "vault" },
                { value: AwsKmsConfigDto, name: "aws-kms" },
            ],
        },
        keepDiscriminatorProperty: true,
    })
    providers!: KmsProviderConfigDto[];
}
