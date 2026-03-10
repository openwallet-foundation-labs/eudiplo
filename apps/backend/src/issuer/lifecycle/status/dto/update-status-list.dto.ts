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
     * Key chain ID to use for signing this status list's JWT.
     * Set to null to use the tenant's default StatusList key chain.
     */
    @ApiPropertyOptional({
        description:
            "Key chain ID to use for signing. Set to null to use the tenant's default StatusList key chain.",
        example: "my-status-list-keychain",
        nullable: true,
    })
    @IsOptional()
    @ValidateIf((o) => o.keyChainId !== null)
    @IsString()
    keyChainId?: string | null;
}
