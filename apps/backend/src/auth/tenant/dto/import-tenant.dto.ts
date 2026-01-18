import { PickType } from "@nestjs/swagger";
import { CreateTenantDto } from "./create-tenant.dto";

export class ImportTenantDto extends PickType(CreateTenantDto, [
    "name",
    "description",
] as const) {}
