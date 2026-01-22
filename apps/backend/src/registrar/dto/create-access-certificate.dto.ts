import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

/**
 * DTO for requesting an access certificate for a specific key.
 */
export class CreateAccessCertificateDto {
    /**
     * The ID of the key to create an access certificate for.
     */
    @ApiProperty({
        description: "The ID of the key to create an access certificate for",
        example: "my-signing-key",
    })
    @IsString()
    keyId!: string;
}
