/**
 * Result of fetching claims from webhook.
 * Either contains claims for immediate issuance or indicates deferred issuance.
 */

export interface ClaimsWebhookResult {
    /**
     * Claims data for the credential (when not deferred).
     */
    claims?: Record<string, any>;
    /**
     * Whether the issuance should be deferred.
     */
    deferred: boolean;
    /**
     * Recommended polling interval in seconds for deferred issuance.
     */
    interval?: number;
}
