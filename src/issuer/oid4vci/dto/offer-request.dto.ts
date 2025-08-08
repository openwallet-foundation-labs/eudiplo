import {
    IsArray,
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';
import { ResponseType } from '../../../verifier/oid4vp/dto/presentation-request.dto';
import { ApiProperty } from '@nestjs/swagger';

export class OfferRequestDto {
    /**
     * @example "qrcode"
     */
    @ApiProperty({
        example: 'qrcode',
        description: 'The type of response expected for the offer request.',
    })
    @IsEnum(ResponseType)
    response_type: ResponseType;

    /**
     * Issuance config id to reference the issuance configuration.
     * @example "pid"
     */
    @IsString()
    issuanceId: string;

    /**
     * Overrides the default values for the credential ids.
     */
    @IsArray()
    @IsOptional()
    credentialConfigurationIds?: string[];

    /**
     * Override the default values for the credential claims.
     */
    @IsObject()
    @IsOptional()
    values?: { [key: string]: Record<string, any> };
}

export class OfferResponse {
    uri: string;
    session: string;
}
