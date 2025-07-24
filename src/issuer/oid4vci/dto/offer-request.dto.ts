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
     * @example "pid"
     */
    @IsString()
    issuanceId: string;

    /**
     * @example ["pid"]
     */
    @IsArray()
    @IsOptional()
    credentialConfigurationIds?: string[];

    @IsObject()
    @IsOptional()
    values?: { [key: string]: Record<string, any> };
}

export class OfferResponse {
    uri: string;
    session: string;
}
