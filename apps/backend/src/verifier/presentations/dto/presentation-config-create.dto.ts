import { OmitType } from "@nestjs/swagger";
import { PresentationConfig } from "../entities/presentation-config.entity";

export class PresentationConfigCreateDto extends OmitType(PresentationConfig, [
    "tenantId",
    "createdAt",
    "updatedAt",
] as const) {
    // Define the properties for the presentation config create DTO
}
