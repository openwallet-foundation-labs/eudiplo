import { OmitType, PartialType } from "@nestjs/swagger";
import { CreateTenantDto } from "./create-tenant.dto";

/**
 * DTO for updating a tenant.
 * All fields are optional except those inherited as required.
 * The `id` field is omitted as it cannot be changed.
 */
export class UpdateTenantDto extends PartialType(
    OmitType(CreateTenantDto, ["id"] as const),
) {}
