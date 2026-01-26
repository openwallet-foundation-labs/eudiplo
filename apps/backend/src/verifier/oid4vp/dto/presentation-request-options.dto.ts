import { WebhookConfig } from "../../../shared/utils/webhook/webhook.dto";
import { TransactionData } from "../../presentations/entities/presentation-config.entity";

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

    /**
     * Optional transaction data to include in the OID4VP request.
     * If provided, this will override the transaction_data from the presentation configuration.
     */
    transaction_data?: TransactionData[];
}
