import { OmitType } from "@nestjs/swagger";
import { KeyImportDto } from "./key-import.dto";

export class UpdateKeyDto extends OmitType(KeyImportDto, ["key"] as const) {}
