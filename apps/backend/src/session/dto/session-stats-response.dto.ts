import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SessionCleanupMode } from "../domain/session-retention.js";
import type { SessionStatus } from "../domain/session-state.js";
import {
    MAX_FAILURE_CODE_LENGTH,
    MAX_FAILURE_CODES,
} from "../domain/session-stats.js";

/**
 * Number of sessions per status. Lists every status of `SessionStatus`;
 * a status without sessions counts 0.
 */
export class SessionStatusCountsDto
    implements Record<`${SessionStatus}`, number>
{
    @ApiProperty({ description: "Sessions waiting for the wallet" })
    active!: number;

    @ApiProperty({
        description:
            "Issuance: first credential issued. Presentation: the wallet fetched the request object.",
    })
    fetched!: number;

    @ApiProperty({
        description:
            "Issuance: the wallet reported credential_accepted. Presentation: response verified.",
    })
    completed!: number;

    @ApiProperty({ description: "Sessions that expired before completion" })
    expired!: number;

    @ApiProperty({
        description:
            "Issuance: the wallet reported credential_failure or credential_deleted. Presentation: verification failed, or the wallet sent an error.",
    })
    failed!: number;

    @ApiProperty({
        description: "Offers and requests an operator cancelled",
    })
    cancelled!: number;
}

/**
 * Number of failed sessions with one failure code.
 */
export class SessionFailureCodeCountDto {
    @ApiProperty({
        description:
            "Failure code, see the session outcome reference; presentation errors a wallet sent keep their own code",
    })
    code!: string;

    @ApiProperty({ description: "Number of failed sessions with this code" })
    count!: number;
}

/**
 * Session counts of one type.
 */
export class SessionTypeStatsDto {
    @ApiProperty({ description: "Number of sessions of this type" })
    total!: number;

    @ApiProperty({
        type: SessionStatusCountsDto,
        description:
            "Number of sessions per status, 0 for a status without any",
    })
    byStatus!: SessionStatusCountsDto;

    @ApiProperty({
        type: [SessionFailureCodeCountDto],
        description: `Failure codes of the failed sessions, most frequent first, at most ${MAX_FAILURE_CODES}, cut to ${MAX_FAILURE_CODE_LENGTH} characters. Failed sessions without a code are not listed.`,
    })
    failureCodes!: SessionFailureCodeCountDto[];

    @ApiProperty({
        type: String,
        format: "date-time",
        nullable: true,
        description:
            "Last update of the most recently updated completed session, or null when none completed",
    })
    lastCompletedAt!: Date | null;
}

/**
 * How long the tenant keeps sessions; only stored sessions are counted.
 */
export class SessionRetentionDto {
    @ApiProperty({
        description:
            "Seconds after creation when the maintenance job processes a session",
    })
    ttlSeconds!: number;

    @ApiProperty({
        enum: SessionCleanupMode,
        description:
            "full: processed sessions are deleted and no longer counted; anonymize: they are kept with their status and still counted",
    })
    cleanupMode!: SessionCleanupMode;
}

/**
 * Session counts of the caller's tenant. A type is present only when the
 * caller may read its sessions, as in the session list.
 */
export class SessionStatsResponseDto {
    @ApiProperty({
        type: SessionRetentionDto,
        description:
            "Effective session retention of the tenant; tells how far back the counts reach",
    })
    retention!: SessionRetentionDto;

    @ApiPropertyOptional({
        type: SessionTypeStatsDto,
        description:
            "Issuance sessions; present only when the caller may read them, as in GET /api/session",
    })
    issuance?: SessionTypeStatsDto;

    @ApiPropertyOptional({
        type: SessionTypeStatsDto,
        description:
            "Presentation sessions; present only when the caller may read them, as in GET /api/session",
    })
    presentation?: SessionTypeStatsDto;
}
