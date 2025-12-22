import { WebhookConfig } from "../../../shared/utils/webhook/webhook.dto";

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

    /**
     * Optional redirect URI to which the user-agent should be redirected after the presentation is completed.
     */
    redirectUri?: string;
}
