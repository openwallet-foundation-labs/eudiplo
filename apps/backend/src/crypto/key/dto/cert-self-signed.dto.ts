import { ApiProperty } from "@nestjs/swagger";
import {
    ArrayMinSize,
    IsArray,
    IsEnum,
    IsNotEmpty,
    IsString,
} from "class-validator";

/**
 * DTO for generating a self-signed certificate.
 */
export class CertSelfSignedDto {
    /**
     * The ID of the key to associate the certificate with.
     */
    @IsString()
    @IsNotEmpty()
    keyId!: string;

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
    type!: ("access" | "signing")[];
}
