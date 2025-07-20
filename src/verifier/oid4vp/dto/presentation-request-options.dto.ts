import { WebhookConfig } from '../../../utils/webhook.dto';

/**
 * PresentationRequestOptions DTO
 */
export interface PresentationRequestOptions {
    /**
     * Optional session identifier for tracking the request.
     */
    session?: string;
    /**
     * Optional webhook configuration to receive the response.
     */
    webhook?: WebhookConfig;
}
