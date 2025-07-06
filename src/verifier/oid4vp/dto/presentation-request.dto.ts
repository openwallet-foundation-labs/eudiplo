import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum ResponseType {
  QRCode = 'qrcode',
  URI = 'uri',
}

export class PresentationRequest {
  /**
   * @example qrcode
   */
  @IsEnum(ResponseType)
  response_type: ResponseType;

  /**
   * @example pid
   */
  @IsString()
  requestId: string;

  @IsString()
  @IsOptional()
  webhook?: string;
}
