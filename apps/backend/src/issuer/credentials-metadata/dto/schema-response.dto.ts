import {
    Equals,
    IsArray,
    IsObject,
    IsOptional,
    IsString,
} from "class-validator";

/**
 * Schema to validate other json objects.
 */
export class SchemaResponse {
    @Equals("https://json-schema.org/draft/2020-12/schema")
    $schema: "https://json-schema.org/draft/2020-12/schema";
    @Equals("object")
    type: "object";
    @IsObject()
    properties: Record<string, any>;
    @IsArray()
    required?: string[];
    @IsOptional()
    @IsString()
    title?: string;
    @IsOptional()
    @IsString()
    description?: string;
}
