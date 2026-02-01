import { OmitType } from "@nestjs/swagger";
import { RegistrarConfigEntity } from "../entities/registrar-config.entity";

/**
 * DTO for creating or importing a registrar configuration.
 * Excludes the tenant field as it will be set from the request context.
 */
export class CreateRegistrarConfigDto extends OmitType(RegistrarConfigEntity, [
    "tenant",
    "tenantId",
] as const) {}
