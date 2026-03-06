import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { KeyUsageType } from "../entities/key-usage.entity";

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

    @ApiPropertyOptional({
        description:
            "Usage types for this key (access, signing, trustList, statusList).",
        enum: KeyUsageType,
        isArray: true,
        example: ["signing"],
    })
    @IsEnum(KeyUsageType, { each: true })
    @IsOptional()
    usageTypes?: KeyUsageType[];
}
