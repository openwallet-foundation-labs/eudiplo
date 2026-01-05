import { ApiPropertyOptional } from "@nestjs/swagger";
import { BitsPerStatus } from "@sd-jwt/jwt-status-list";
import { IsBoolean, IsIn, IsInt, IsOptional, Min } from "class-validator";

/**
 * DTO for updating status list configuration.
 * All fields are optional - only provided fields will be updated.
 * Set a field to null to reset it to the global default.
 */
export class UpdateStatusListConfigDto {
    /**
     * The capacity of the status list (number of entries).
     * Set to null to reset to global default.
     */
    @ApiPropertyOptional({
        description:
            "The capacity of the status list. Set to null to reset to global default.",
        example: 10000,
        minimum: 100,
        nullable: true,
    })
    @IsOptional()
    @IsInt()
    @Min(100)
    capacity?: number | null;

    /**
     * The number of bits used per status entry.
     * Set to null to reset to global default.
     */
    @ApiPropertyOptional({
        description:
            "Bits per status entry. Set to null to reset to global default.",
        enum: [1, 2, 4, 8],
        nullable: true,
    })
    @IsOptional()
    @IsIn([1, 2, 4, 8, null])
    bits?: BitsPerStatus | null;

    /**
     * Time-to-live in seconds for the status list JWT.
     * Set to null to reset to global default.
     */
    @ApiPropertyOptional({
        description:
            "TTL in seconds for the status list JWT. Set to null to reset to global default.",
        example: 3600,
        minimum: 60,
        nullable: true,
    })
    @IsOptional()
    @IsInt()
    @Min(60)
    ttl?: number | null;

    /**
     * If true, regenerate JWT immediately on status changes.
     * Set to null to reset to global default (false).
     */
    @ApiPropertyOptional({
        description:
            "If true, regenerate JWT on every status change. Set to null to reset to default (false).",
        nullable: true,
    })
    @IsOptional()
    @IsBoolean()
    immediateUpdate?: boolean | null;

    /**
     * Whether to include aggregation_uri in status list JWTs.
     * Set to null to reset to global default (true).
     */
    @ApiPropertyOptional({
        description:
            "If true, include aggregation_uri in status list JWTs for pre-fetching support. Set to null to reset to default (true).",
        nullable: true,
    })
    @IsOptional()
    @IsBoolean()
    enableAggregation?: boolean | null;
}
