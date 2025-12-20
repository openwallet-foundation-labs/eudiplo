import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";

class DisplayLogo {
    @IsString()
    uri!: string;

    @IsString()
    @IsOptional()
    alt_text?: string;
}
export class DisplayInfo {
    @IsString()
    @IsOptional()
    name?: string;
    @IsString()
    @IsOptional()
    locale?: string;

    @ValidateNested()
    @IsOptional()
    @Type(() => DisplayLogo)
    logo?: DisplayLogo;
}
