import { PartialType } from "@nestjs/swagger";
import { PresentationConfigCreateDto } from "./presentation-config-create.dto";

export class PresentationConfigUpdateDto extends PartialType(
    PresentationConfigCreateDto,
) {}
