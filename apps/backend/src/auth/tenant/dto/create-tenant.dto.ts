import { OmitType } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { Role } from "../../roles/role.enum";
import { TenantEntity } from "../entitites/tenant.entity";

export class CreateTenantDto extends OmitType(TenantEntity, [
    "clients",
    "status",
] as const) {
    @IsOptional()
    @IsString({ each: true })
    roles?: Role[];
}
