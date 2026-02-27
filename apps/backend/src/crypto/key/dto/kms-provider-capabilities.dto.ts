import { ApiProperty } from "@nestjs/swagger";

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
        description: "Unique provider name (matches the key in kms.json).",
        example: "db",
    })
    name!: string;

    @ApiProperty({
        description: "Capabilities of this provider.",
        type: KmsProviderCapabilitiesDto,
    })
    capabilities!: KmsProviderCapabilitiesDto;
}
