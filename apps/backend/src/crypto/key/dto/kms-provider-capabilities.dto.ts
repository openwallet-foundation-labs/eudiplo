import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Describes what operations a KMS provider supports.
 * Returned by the providers endpoint so the UI can adapt accordingly.
 */
export class KmsProviderCapabilitiesDto {
    @ApiProperty({
        description: "Whether the provider supports importing existing keys.",
        example: true,
    })
    canImport!: boolean;

    @ApiProperty({
        description: "Whether the provider supports generating new keys.",
        example: true,
    })
    canCreate!: boolean;

    @ApiProperty({
        description: "Whether the provider supports deleting keys.",
        example: true,
    })
    canDelete!: boolean;
}

/**
 * Full information about a single KMS provider.
 */
export class KmsProviderInfoDto {
    @ApiProperty({
        description: "Unique provider ID (matches the id in kms.json).",
        example: "main-vault",
    })
    name!: string;

    @ApiProperty({
        description: "Type of the KMS provider (db, vault, aws-kms).",
        example: "vault",
    })
    type!: string;

    @ApiPropertyOptional({
        description: "Human-readable description of this provider instance.",
        example: "Production HashiCorp Vault",
    })
    description?: string;

    @ApiProperty({
        description: "Capabilities of this provider.",
        type: KmsProviderCapabilitiesDto,
    })
    capabilities!: KmsProviderCapabilitiesDto;
}
