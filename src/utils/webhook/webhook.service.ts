import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { SessionService } from '../../session/session.service';
import { SessionLoggerService } from '../logger/session-logger.service';
import { Notification, Session } from '../../session/entities/session.entity';
import { SessionLogContext } from '../logger/session-logger-context';

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
        private httpService: HttpService,
        private sessionService: SessionService,
        private sessionLogger: SessionLoggerService,
    ) {}

    /**
     * Sends a webhook with the provided credentials, also return the response data.
     * @param session
     * @param logContext
     * @param credentials
     */
    async sendWebhook(
        session: Session,
        logContext: SessionLogContext,
        credentials: any[],
    ) {
        const headers: Record<string, string> = {};
        if (session.webhook!.auth && session.webhook!.auth.type === 'apiKey') {
            headers[session.webhook!.auth.config.headerName] =
                session.webhook!.auth.config.value;
        }
        this.sessionLogger.logSession(logContext, 'Sending webhook', {
            webhookUrl: session.webhook!.url,
            authType: session.webhook!.auth?.type || 'none',
        });

        await firstValueFrom(
            this.httpService.post(
                session.webhook!.url,
                {
                    credentials,
                    session: session.id,
                },
                {
                    headers,
                },
            ),
        ).then(
            async (webhookResponse) => {
                //TODO: better: just store it when it's a presentation during issuance
                if (webhookResponse.data) {
                    session.credentialPayload!.values = webhookResponse.data;
                    //store received webhook response
                    await this.sessionService.add(
                        session.id,
                        session.tenantId,
                        {
                            credentialPayload: session.credentialPayload,
                        },
                    );
                }

                this.sessionLogger.logSession(
                    logContext,
                    'Webhook sent successfully',
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
                    'Error sending webhook',
                    {
                        webhookUrl: session.webhook!.url,
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

        if (webhook.auth && webhook.auth.type === 'apiKey') {
            headers[webhook.auth.config.headerName] = webhook.auth.config.value;
        }
        this.sessionLogger.logSession(
            logContext,
            'Sending webhook notification',
            {
                webhookUrl: webhook.url,
                authType: webhook.auth?.type || 'none',
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
            async (webhookResponse) => {
                //TODO: better: just store it when it's a presentation during issuance
                if (webhookResponse.data) {
                    session.credentialPayload!.values = webhookResponse.data;
                    //store received webhook response
                    await this.sessionService.add(
                        session.id,
                        session.tenantId,
                        {
                            credentialPayload: session.credentialPayload,
                        },
                    );
                }

                this.sessionLogger.logSession(
                    logContext,
                    'Webhook notification sent successfully',
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
                    'Error sending webhook',
                    {
                        webhookUrl: session.webhook!.url,
                    },
                );
                throw new Error(`Error sending webhook: ${err.message || err}`);
            },
        );
    }
}
