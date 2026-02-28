import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

/**
 * DTO for generating a new key via the server.
 */
export class KeyGenerateDto {
    @ApiPropertyOptional({
        description:
            "KMS provider to use (defaults to the configured default provider).",
        example: "vault",
    })
    @IsString()
    @IsOptional()
    kmsProvider?: string;

    @ApiPropertyOptional({
        description: "Optional human-readable description for the key.",
    })
    @IsString()
    @IsOptional()
    description?: string;
}
