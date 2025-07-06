import {
  ArrayNotEmpty,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { ResponseType } from 'src/verifier/oid4vp/dto/presentation-request.dto';

export class OfferRequest {
  @IsEnum(ResponseType)
  response_type: ResponseType;

  /**
   * @example ["pid"]
   */
  @ArrayNotEmpty()
  @IsString({ each: true })
  credentialConfigurationIds: string[];

  @IsObject()
  @IsOptional()
  values?: { [key: string]: Record<string, any> };
}
