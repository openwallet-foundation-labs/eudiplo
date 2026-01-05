import { ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { Role } from "../../roles/role.enum";
import { SessionStorageConfig } from "../entitites/session-storage-config";
import { TenantEntity } from "../entitites/tenant.entity";

export class CreateTenantDto extends OmitType(TenantEntity, [
    "clients",
    "status",
    "sessionConfig",
] as const) {
    @IsOptional()
    @IsString({ each: true })
    roles?: Role[];

    /**
     * Session storage configuration for this tenant.
     * Controls how long sessions are kept and how they are cleaned up.
     */
    @ApiPropertyOptional({
        description:
            "Session storage configuration. Controls TTL and cleanup behavior.",
        type: () => SessionStorageConfig,
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => SessionStorageConfig)
    sessionConfig?: SessionStorageConfig;
}
