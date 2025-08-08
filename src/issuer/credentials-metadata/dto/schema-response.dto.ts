export class SchemaResponse {
    $schema = 'https://json-schema.org/draft/2020-12/schema';
    type = 'object';
    properties: Record<string, any>;
    required: string[];
}
