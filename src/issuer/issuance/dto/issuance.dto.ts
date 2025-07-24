import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { PresentationDuringIssuance } from '../../credentials-metadata/dto/credential-config.dto';

export class IssuanceDto {
    @IsString({ each: true })
    @IsArray()
    credentialConfigs: string[];

    @IsObject()
    @IsOptional()
    presentation_during_issuance?: PresentationDuringIssuance;
}
