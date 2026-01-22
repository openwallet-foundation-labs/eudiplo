import { PartialType } from "@nestjs/swagger";
import { CreateRegistrarConfigDto } from "./create-registrar-config.dto";

/**
 * DTO for updating a registrar configuration.
 * All fields are optional.
 */
export class UpdateRegistrarConfigDto extends PartialType(
    CreateRegistrarConfigDto,
) {}
