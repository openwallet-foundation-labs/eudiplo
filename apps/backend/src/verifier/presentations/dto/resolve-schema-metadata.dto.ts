import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUrl } from "class-validator";

export class ResolveSchemaMetadataDto {
    @ApiProperty({
        description:
            "Schema metadata URL to resolve server-side. The response must contain a signedJwt field.",
        example:
            "https://registrar.example.com/schema-metadata/5c0d7dbb-ef2e-448b-b84f-b8103575947b",
    })
    @IsString()
    @IsUrl({ require_tld: false })
    schemaMetadataUrl!: string;
}
