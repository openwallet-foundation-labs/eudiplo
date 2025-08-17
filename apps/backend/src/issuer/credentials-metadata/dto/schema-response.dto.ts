import { IsArray, IsObject, IsString } from "class-validator";

export class SchemaResponse {
    @IsString()
    $schema = "https://json-schema.org/draft/2020-12/schema";
    @IsString()
    type = "object";
    @IsObject()
    properties: Record<string, any>;
    @IsArray()
    required: string[];
}
