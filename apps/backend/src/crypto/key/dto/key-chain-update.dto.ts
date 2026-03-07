import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min, ValidateNested } from "class-validator";

/**
 * DTO for updating rotation policy.
 */
export class RotationPolicyUpdateDto {
    @ApiPropertyOptional({
        description: "Whether automatic key rotation is enabled.",
    })
    @IsBoolean()
    @IsOptional()
    enabled?: boolean;

    @ApiPropertyOptional({
        description: "Rotation interval in days.",
        minimum: 1,
        maximum: 3650,
    })
    @IsNumber()
    @Min(1)
    @Max(3650)
    @IsOptional()
    intervalDays?: number;

    @ApiPropertyOptional({
        description: "Certificate validity in days.",
        minimum: 1,
        maximum: 3650,
    })
    @IsNumber()
    @Min(1)
    @Max(3650)
    @IsOptional()
    certValidityDays?: number;
}

/**
 * DTO for updating a key chain.
 *
 * Only metadata and rotation policy can be updated.
 * Key material and certificates are managed internally.
 */
export class KeyChainUpdateDto {
    @ApiPropertyOptional({
        description: "Human-readable description for the key chain.",
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({
        description: "Rotation policy configuration.",
        type: RotationPolicyUpdateDto,
    })
    @ValidateNested()
    @Type(() => RotationPolicyUpdateDto)
    @IsOptional()
    rotationPolicy?: RotationPolicyUpdateDto;

    @ApiPropertyOptional({
        description:
            "Active certificate chain in PEM format. Used for external certificate updates.",
    })
    @IsString()
    @IsOptional()
    activeCertificate?: string;
}
