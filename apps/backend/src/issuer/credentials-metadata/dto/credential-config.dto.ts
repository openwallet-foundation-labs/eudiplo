import { ApiProperty } from "@nestjs/swagger";
import { IsEmpty, IsOptional, IsString } from "class-validator";

export class VCT {
    @ApiProperty({
        required: false,
    })
    @IsEmpty()
    vct?: string;
    @IsOptional()
    @IsString()
    name?: string;
    @IsOptional()
    @IsString()
    description?: string;
    @IsOptional()
    @IsString()
    extends?: string;
    @IsOptional()
    @IsString()
    "extends#integrity"?: string;
    @IsOptional()
    @IsString()
    schema_uri?: string;
    @IsOptional()
    @IsString()
    "schema_uri#integrity"?: string;
}
