import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";

/**
 * Configuration for the DB KMS provider.
 * No additional configuration required — keys are stored in the database.
 */
export class DbKmsConfigDto {}

/**
 * Configuration for the HashiCorp Vault KMS provider.
 */
export class VaultKmsConfigDto {
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
 * Root DTO for kms.json.
 *
 * Provider keys act as both the provider name and the adapter type.
 *
 * Example:
 * ```json
 * {
 *   "defaultProvider": "db",
 *   "providers": {
 *     "db": {},
 *     "vault": { "vaultUrl": "${VAULT_URL}", "vaultToken": "${VAULT_TOKEN}" }
 *   }
 * }
 * ```
 */
export class KmsConfigDto {
    @ApiPropertyOptional({
        description:
            'Name of the default KMS provider. Defaults to "db" if not set.',
        example: "db",
    })
    @IsString()
    @IsOptional()
    defaultProvider?: string;

    @ApiProperty({
        description:
            "Map of provider type → provider-specific config. Keys must match a supported adapter type (e.g., db, vault).",
        example: {
            db: {},
            vault: {
                vaultUrl: "${VAULT_URL}",
                vaultToken: "${VAULT_TOKEN}",
            },
        },
    })
    @IsObject()
    providers!: {
        db?: DbKmsConfigDto;
        vault?: VaultKmsConfigDto;
    };
}
