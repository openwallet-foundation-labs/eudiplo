import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

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
}
