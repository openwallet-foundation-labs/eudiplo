import { IsString } from "class-validator";

export class VCT {
    @IsString()
    vct: string;
    @IsString()
    name?: string;
    @IsString()
    description?: string;
    @IsString()
    extends?: string;
    @IsString()
    "extends#integrity"?: string;
    @IsString()
    schema_uri?: string;
    @IsString()
    "schema_uri#integrity"?: string;
}
