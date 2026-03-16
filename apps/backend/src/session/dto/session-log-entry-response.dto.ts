import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SessionLogEntryResponseDto {
    @ApiProperty({ description: "Log entry ID" })
    id!: string;

    @ApiProperty({ description: "Session ID" })
    sessionId!: string;

    @ApiProperty({ description: "Timestamp of the log entry" })
    timestamp!: Date;

    @ApiProperty({
        description: "Log level",
        enum: ["info", "warn", "error"],
    })
    level!: string;

    @ApiPropertyOptional({ description: "Flow stage" })
    stage?: string;

    @ApiProperty({ description: "Log message" })
    message!: string;

    @ApiPropertyOptional({ description: "Additional structured detail" })
    detail?: Record<string, unknown>;
}
