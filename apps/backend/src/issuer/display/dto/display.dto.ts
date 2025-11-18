import { Type } from "class-transformer";
import { IsString, ValidateNested } from "class-validator";

class DisplayLogo {
    @IsString()
    uri!: string;
}
export class DisplayInfo {
    @IsString()
    name!: string;
    @IsString()
    locale!: string;

    @ValidateNested()
    @Type(() => DisplayLogo)
    logo!: DisplayLogo;
}
