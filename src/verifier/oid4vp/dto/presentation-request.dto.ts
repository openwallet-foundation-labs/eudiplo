import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { WebhookConfig } from '../../../utils/webhook.dto';

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

    @IsObject()
    @IsOptional()
    webhook?: WebhookConfig;
}
