import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { firstValueFrom } from "rxjs";
import {
    Notification,
    Session,
} from "../../../session/entities/session.entity";
import { SessionService } from "../../../session/session.service";
import { SessionLoggerService } from "../logger/session-logger.service";
import { SessionLogContext } from "../logger/session-logger-context";
import { WebhookConfig } from "./webhook.dto";

/**
 * Response from a webhook to receive credentials.
 * Can include claims data for immediate issuance or a deferred flag for deferred issuance.
 */
export interface WebhookResponse {
    /**
     * Redirect URI for OAuth-style redirects.
     */
    redirectUri?: string;
    /**
     * When true, indicates that the credential issuance should be deferred.
     * The wallet will receive a transaction_id to poll later.
     */
    deferred?: boolean;
    /**
     * Recommended polling interval in seconds for deferred issuance.
     * Defaults to 5 seconds if not specified.
     */
    interval?: number;
    /**
     * Claims data keyed by credential configuration ID.
     * Allows dynamic keys for credential configuration IDs.
     */
    [credentialConfigurationId: string]:
        | Record<string, any>
        | string
        | boolean
        | number
        | undefined;
}

/**
 * Service for handling webhooks in the application.
 */
@Injectable()
export class WebhookService {
    /**
     * Constructor for WebhookService.
     * @param httpService
     * @param sessionService
     * @param sessionLogger
     */
    constructor(
        private readonly httpService: HttpService,
        private readonly sessionService: SessionService,
        private readonly sessionLogger: SessionLoggerService,
    ) {}

    /**
     * Sends a webhook with the optional provided credentials, return the response data.
     * @returns WebhookResponse containing claims data or deferred issuance indicator
     */
    sendWebhook(values: {
        webhook: WebhookConfig;
        logContext: SessionLogContext;
        session: Session;
        credentials?: any[];
        expectResponse: boolean;
    }): Promise<WebhookResponse> {
        const headers: Record<string, string> = {};

        if (values.webhook.auth && values.webhook.auth.type === "apiKey") {
            headers[values.webhook.auth.config.headerName] =
                values.webhook.auth.config.value;
        }
        this.sessionLogger.logSession(values.logContext, "Sending webhook", {
            webhookUrl: values.webhook.url,
            authType: values.webhook.auth?.type || "none",
        });

        return firstValueFrom(
            this.httpService.post(
                values.webhook.url,
                {
                    credentials: values.credentials,
                    session: values.session.id,
                },
                {
                    headers,
                },
            ),
        ).then(
            async (webhookResponse) => {
                this.sessionLogger.logSession(
                    values.logContext,
                    "Webhook sent successfully",
                    {
                        responseStatus: webhookResponse.status,
                        hasResponseData: !!webhookResponse.data,
                    },
                );

                //check if a redirect URI is passed, we either expect a redirect or claims, but never both.
                if (webhookResponse.data?.redirectUri) {
                    // redirectUri is returned but no special handling needed here
                } else if (webhookResponse.data && values.expectResponse) {
                    // Store received webhook response
                    await this.sessionService.add(values.session.id, {
                        credentialPayload: values.session.credentialPayload,
                    });
                }

                return webhookResponse.data;
            },
            (err) => {
                this.sessionLogger.logSessionError(
                    values.logContext,
                    err,
                    "Error sending webhook",
                    {
                        webhookUrl: values.webhook.url,
                    },
                );
                throw new Error(`Error sending webhook: ${err.message || err}`);
            },
        );
    }

    /**
     * Sends a webhook notification for a session.
     * @param session
     * @param logContext
     * @param notification
     */
    async sendWebhookNotification(
        session: Session,
        logContext: SessionLogContext,
        notification: Notification,
    ) {
        const headers: Record<string, string> = {};
        const webhook = session.notifyWebhook!;

        if (webhook.auth && webhook.auth.type === "apiKey") {
            headers[webhook.auth.config.headerName] = webhook.auth.config.value;
        }
        this.sessionLogger.logSession(
            logContext,
            "Sending webhook notification",
            {
                webhookUrl: webhook.url,
                authType: webhook.auth?.type || "none",
            },
        );

        await firstValueFrom(
            this.httpService.post(
                webhook.url,
                {
                    notification,
                    session: session.id,
                },
                {
                    headers,
                },
            ),
        ).then(
            (webhookResponse) => {
                //TODO: update notification status based on response
                this.sessionLogger.logSession(
                    logContext,
                    "Webhook notification sent successfully",
                    {
                        responseStatus: webhookResponse.status,
                        hasResponseData: !!webhookResponse.data,
                    },
                );
            },
            (err) => {
                this.sessionLogger.logSessionError(
                    logContext,
                    err,
                    "Error sending webhook",
                    {
                        webhookUrl: webhook.url,
                    },
                );
                throw new Error(`Error sending webhook: ${err.message || err}`);
            },
        );
    }

    /**
     * Unified webhook for fetching claims.
     * Sends a consistent payload regardless of AS type (internal or external).
     *
     * @param values.webhook The webhook configuration
     * @param values.logContext Logging context
     * @param values.session The session ID
     * @param values.credentialConfigurationId The credential configuration being requested
     * @param values.identity Optional identity context from authorization (works for both internal and external AS)
     * @param values.credentials Optional presented credentials (for presentation flows)
     * @returns WebhookResponse containing claims data or deferred issuance indicator
     */
    async sendClaimsWebhook(values: {
        webhook: WebhookConfig;
        logContext: SessionLogContext;
        session: string;
        credentialConfigurationId: string;
        identity?: {
            iss: string;
            sub: string;
            token_claims: Record<string, unknown>;
        };
        credentials?: any[];
    }): Promise<WebhookResponse> {
        const headers: Record<string, string> = {};

        if (values.webhook.auth?.type === "apiKey") {
            headers[values.webhook.auth.config.headerName] =
                values.webhook.auth.config.value;
        }

        this.sessionLogger.logSession(
            values.logContext,
            "Sending claims webhook",
            {
                webhookUrl: values.webhook.url,
                authType: values.webhook.auth?.type || "none",
                credentialConfigurationId: values.credentialConfigurationId,
                hasIdentity: !!values.identity,
                hasCredentials: !!values.credentials?.length,
            },
        );

        const payload: Record<string, unknown> = {
            session: values.session,
            credential_configuration_id: values.credentialConfigurationId,
        };

        // Include identity context when available (from internal or external AS)
        if (values.identity) {
            payload.identity = values.identity;
        }

        // Include presented credentials when available (presentation flow)
        if (values.credentials?.length) {
            payload.credentials = values.credentials;
        }

        return firstValueFrom(
            this.httpService.post(values.webhook.url, payload, { headers }),
        ).then(
            (webhookResponse) => {
                this.sessionLogger.logSession(
                    values.logContext,
                    "Claims webhook sent successfully",
                    {
                        responseStatus: webhookResponse.status,
                        hasResponseData: !!webhookResponse.data,
                    },
                );
                return webhookResponse.data;
            },
            (err) => {
                this.sessionLogger.logSessionError(
                    values.logContext,
                    err,
                    "Error sending claims webhook",
                    {
                        webhookUrl: values.webhook.url,
                    },
                );
                throw new Error(
                    `Error sending claims webhook: ${err.message || err}`,
                );
            },
        );
    }
}
