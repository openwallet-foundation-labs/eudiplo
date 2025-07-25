import { IsArray, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AuthenticationConfigDto } from './authentication-config.dto';

export class IssuanceDto {
    @IsString()
    id: string;

    @IsString({ each: true })
    @IsArray()
    credentialConfigs: string[];

    @IsObject()
    @ValidateNested()
    @Type(() => AuthenticationConfigDto)
    authenticationConfig: AuthenticationConfigDto;
}
