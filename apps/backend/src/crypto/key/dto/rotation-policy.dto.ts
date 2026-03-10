import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsBoolean,
    IsNumber,
    IsOptional,
    IsString,
    Min,
} from "class-validator";

/**
 * DTO for key rotation policy configuration.
 */
export class RotationPolicyDto {
    @ApiProperty({
        description: "Whether automatic key rotation is enabled.",
        example: true,
    })
    @IsBoolean()
    enabled!: boolean;

    @ApiPropertyOptional({
        description:
            "Rotation interval in days. Key material will be rotated after this many days.",
        example: 30,
        minimum: 1,
    })
    @IsNumber()
    @IsOptional()
    @Min(1)
    intervalDays?: number;

    @ApiPropertyOptional({
        description:
            "Certificate validity in days when generating new certificates.",
        example: 90,
        minimum: 1,
    })
    @IsNumber()
    @IsOptional()
    @Min(1)
    certValidityDays?: number;

    @ApiPropertyOptional({
        description:
            "The ID of the CA key used to sign certificates for this key. If not set, certificates will be self-signed.",
        example: "ca-key-id",
    })
    @IsString()
    @IsOptional()
    signingCaKeyId?: string;
}
