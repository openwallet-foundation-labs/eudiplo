import { ApiPropertyOptional } from "@nestjs/swagger";
import { BitsPerStatus } from "@sd-jwt/jwt-status-list";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

/**
 * DTO for creating a new status list.
 */
export class CreateStatusListDto {
    /**
     * Optional credential configuration ID to bind this list exclusively to.
     * If not provided, the list will be shared and available for any credential configuration.
     */
    @ApiPropertyOptional({
        description:
            "Credential configuration ID to bind this list exclusively to. Leave empty for a shared list.",
        example: "org.iso.18013.5.1.mDL",
    })
    @IsOptional()
    @IsString()
    credentialConfigurationId?: string;

    /**
     * Optional certificate ID to use for signing this status list's JWT.
     * If not provided, uses the tenant's default StatusList certificate.
     */
    @ApiPropertyOptional({
        description:
            "Certificate ID to use for signing. Leave empty to use the tenant's default StatusList certificate.",
        example: "my-status-list-cert",
    })
    @IsOptional()
    @IsString()
    certId?: string;

    /**
     * Number of bits per status entry.
     * If not provided, uses the tenant's configured default or the global default.
     */
    @ApiPropertyOptional({
        description:
            "Bits per status value. More bits allow more status states. Defaults to tenant configuration.",
        enum: [1, 2, 4, 8],
        example: 1,
    })
    @IsOptional()
    @IsIn([1, 2, 4, 8])
    bits?: BitsPerStatus;

    /**
     * Maximum capacity of the status list (number of entries).
     * If not provided, uses the tenant's configured default or the global default.
     */
    @ApiPropertyOptional({
        description:
            "Maximum number of credential status entries. Defaults to tenant configuration.",
        example: 100000,
    })
    @IsOptional()
    @IsInt()
    @Min(1000)
    capacity?: number;
}
