import { ApiProperty } from "@nestjs/swagger";
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsOptional,
    IsString,
} from "class-validator";

/**
 * DTO for updating certificate metadata (description and usage types).
 */
export class CertUpdateDto {
    /**
     * Type(s) of the certificate (access and/or signing).
     */
    @ApiProperty({
        enum: ["access", "signing"],
        isArray: true,
        description: "Certificate usage type(s)",
    })
    @IsArray()
    @ArrayMinSize(1)
    @IsEnum(["access", "signing"], { each: true })
    @IsOptional()
    type?: ("access" | "signing")[];

    /**
     * Optional description of the certificate.
     */
    @IsString()
    @IsOptional()
    description?: string;
}
