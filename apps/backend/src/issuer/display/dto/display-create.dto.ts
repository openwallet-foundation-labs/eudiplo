import { OmitType } from "@nestjs/swagger";
import { DisplayEntity } from "../entities/display.entity";

export class DisplayCreateDto extends OmitType(DisplayEntity, [
    "tenant",
] as const) {}
