import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { WebhookConfig } from '../../../utils/webhook/webhook.dto';

/**
 * Enum for the type of response expected from the presentation request.
 */
export enum ResponseType {
    /**
     * Response type indicating a QR code will be returned.
     */
    QRCode = 'qrcode',
    /**
     * Response type indicating a URI will be returned.
     */
    URI = 'uri',
}

/**
 * DTO for the presentation request containing the response type and request ID.
 */
export class PresentationRequest {
    /**
     * @example qrcode
     */
    @IsEnum(ResponseType)
    response_type: ResponseType;

    /**
     * Identifier of the presentation configuration
     * @example pid
     */
    @IsString()
    requestId: string;

    /**
     * Webhook configuration to receive the response.
     * If not provided, the configured webhook from the configuration will be used.
     */
    @IsObject()
    @IsOptional()
    webhook?: WebhookConfig;
}
