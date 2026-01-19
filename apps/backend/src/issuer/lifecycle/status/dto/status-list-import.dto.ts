import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { BitsPerStatus } from "@sd-jwt/jwt-status-list";
import {
    IsIn,
    IsInt,
    IsOptional,
    IsString,
    Min,
    ValidateIf,
} from "class-validator";

/**
 * DTO for importing a status list configuration from a JSON file.
 * This enables "config as code" for status lists.
 */
export class StatusListImportDto {
    /**
     * Unique identifier for the status list.
     * Used to check if the list already exists and for updates.
     */
    @ApiProperty({
        description: "Unique identifier for the status list",
    })
    @IsString()
    id!: string;

    /**
     * Optional credential configuration ID to bind this list exclusively to.
     * If not provided, the list will be shared and available for any credential configuration.
     */
    @ApiPropertyOptional({
        description:
            "Credential configuration ID to bind this list exclusively to. Leave empty for a shared list.",
        example: "org.iso.18013.5.1.mDL",
    })
    @IsOptional()
    @ValidateIf((o) => o.credentialConfigurationId !== null)
    @IsString()
    credentialConfigurationId?: string | null;

    /**
     * Optional certificate ID to use for signing this status list's JWT.
     * If not provided, uses the tenant's default StatusList certificate.
     */
    @ApiPropertyOptional({
        description:
            "Certificate ID to use for signing. Leave empty to use the tenant's default StatusList certificate.",
        example: "my-status-list-cert",
    })
    @IsOptional()
    @IsString()
    certId?: string;

    /**
     * Optional capacity of the status list (number of entries).
     * If not provided, uses the tenant's configured default or the global default.
     */
    @ApiPropertyOptional({
        description:
            "Capacity of the status list. If not provided, uses tenant or global defaults.",
        example: 10000,
        minimum: 100,
    })
    @IsOptional()
    @IsInt()
    @Min(100)
    capacity?: number;

    /**
     * Optional bits per status.
     * If not provided, uses the tenant's configured default or the global default.
     */
    @ApiPropertyOptional({
        description:
            "Bits per status value. If not provided, uses tenant or global defaults.",
        enum: [1, 2, 4, 8],
        example: 1,
    })
    @IsOptional()
    @IsIn([1, 2, 4, 8])
    bits?: BitsPerStatus;
}
