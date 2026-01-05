import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, ValidateIf } from "class-validator";

/**
 * DTO for updating a status list's binding.
 */
export class UpdateStatusListDto {
    /**
     * Credential configuration ID to bind this list exclusively to.
     * Set to null to make this a shared list.
     */
    @ApiPropertyOptional({
        description:
            "Credential configuration ID to bind this list exclusively to. Set to null to make this a shared list.",
        example: "org.iso.18013.5.1.mDL",
        nullable: true,
    })
    @IsOptional()
    @ValidateIf((o) => o.credentialConfigurationId !== null)
    @IsString()
    credentialConfigurationId?: string | null;

    /**
     * Certificate ID to use for signing this status list's JWT.
     * Set to null to use the tenant's default StatusList certificate.
     */
    @ApiPropertyOptional({
        description:
            "Certificate ID to use for signing. Set to null to use the tenant's default StatusList certificate.",
        example: "my-status-list-cert",
        nullable: true,
    })
    @IsOptional()
    @ValidateIf((o) => o.certId !== null)
    @IsString()
    certId?: string | null;
}
