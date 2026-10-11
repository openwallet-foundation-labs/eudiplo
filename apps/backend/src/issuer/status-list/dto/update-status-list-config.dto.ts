import { ApiPropertyOptional } from "@nestjs/swagger";
import { BitsPerStatus } from "@owf/token-status-list";
import { createZodDto } from "nestjs-zod";
import { UpdateStatusListConfigSchema } from "./status-list.schema.js";

/**
 * DTO for updating status list configuration.
 * The request replaces the stored configuration: a field that is omitted or
 * null is removed and follows the global default of the instance.
 */
export class UpdateStatusListConfigDto extends createZodDto(
    UpdateStatusListConfigSchema,
) {
    /**
     * The capacity of the status list (number of entries).
     * Omit or set to null to follow the global default.
     */
    @ApiPropertyOptional({
        description:
            "The capacity of new status lists. Omit or set to null to follow STATUS_CAPACITY of the instance.",
        example: 10000,
        minimum: 100,
        nullable: true,
    })
    capacity?: number | null;

    /**
     * The number of bits used per status entry.
     * Omit or set to null to follow the global default.
     */
    @ApiPropertyOptional({
        description:
            "Bits per status entry of new status lists. Omit or set to null to follow STATUS_BITS of the instance.",
        enum: [1, 2, 4, 8],
        nullable: true,
    })
    bits?: BitsPerStatus | null;

    /**
     * Time-to-live in seconds for the status list JWT.
     * Omit or set to null to follow the global default.
     */
    @ApiPropertyOptional({
        description:
            "TTL in seconds for the status list JWT. Omit or set to null to follow STATUS_TTL of the instance.",
        example: 3600,
        minimum: 60,
        nullable: true,
    })
    ttl?: number | null;

    /**
     * If true, regenerate JWT immediately on status changes.
     * Omit or set to null to follow STATUS_IMMEDIATE_UPDATE.
     */
    @ApiPropertyOptional({
        description:
            "If true, regenerate JWT on every status change. Omit or set to null to follow STATUS_IMMEDIATE_UPDATE of the instance.",
        nullable: true,
    })
    immediateUpdate?: boolean | null;

    /**
     * Whether to include aggregation_uri in status list JWTs.
     * Omit or set to null to follow STATUS_ENABLE_AGGREGATION.
     */
    @ApiPropertyOptional({
        description:
            "If true, include aggregation_uri in status list JWTs for pre-fetching support. Omit or set to null to follow STATUS_ENABLE_AGGREGATION of the instance.",
        nullable: true,
    })
    enableAggregation?: boolean | null;
}
