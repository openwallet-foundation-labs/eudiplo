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

    @ApiProperty({
        description:
            "Algorithms new and imported key chains of this provider may use (ES256, ES384, ES512), narrowed by algorithms in kms.json. Existing key chains keep their own algorithm.",
        example: ["ES256"],
        isArray: true,
        type: String,
    })
    supportedAlgs!: string[];

    @ApiProperty({
        description:
            "Algorithm of a new key chain created without alg (defaultAlgorithm in kms.json).",
        example: "ES256",
    })
    defaultAlg!: string;
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
