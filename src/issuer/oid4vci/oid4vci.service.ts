import {
    BadRequestException,
    ConflictException,
    Injectable,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    type HttpMethod,
    Oauth2ResourceServer,
    SupportedAuthenticationScheme,
    authorizationCodeGrantIdentifier,
    preAuthorizedCodeGrantIdentifier,
} from '@openid4vc/oauth2';
import {
    type CredentialResponse,
    type IssuerMetadataResult,
    Openid4vciDraftVersion,
    Openid4vciIssuer,
} from '@openid4vc/openid4vci';
import type { Request } from 'express';
import { CredentialsService } from '../credentials/credentials.service';
import { CryptoService } from '../../crypto/crypto.service';
import { AuthorizeService } from '../authorize/authorize.service';
import { getHeadersFromRequest } from './util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SessionService } from '../../session/session.service';
import { v4 } from 'uuid';
import { OfferRequestDto, OfferResponse } from './dto/offer-request.dto';
import { NotificationRequestDto } from './dto/notification-request.dto';
import { SessionLoggerService } from '../../utils/logger/session-logger.service';
import { SessionLogContext } from '../../utils/logger/session-logger-context';
import { TokenPayload } from '../../auth/token.decorator';
import { IssuanceService } from '../issuance/issuance.service';
import { WebhookService } from '../../utils/webhook/webhook.service';
import { Session, SessionStatus } from '../../session/entities/session.entity';

@Injectable()
export class Oid4vciService implements OnModuleInit {
    private issuer: Openid4vciIssuer;

    resourceServer: Oauth2ResourceServer;

    constructor(
        private readonly authzService: AuthorizeService,
        private readonly cryptoService: CryptoService,
        public readonly credentialsService: CredentialsService,
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService,
        private readonly sessionLogger: SessionLoggerService,
        private readonly issuanceService: IssuanceService,
        private readonly webhookService: WebhookService,
    ) {}
    onModuleInit() {
        //TODO: align for tenant
        const callbacks = this.cryptoService.getCallbackContext('');
        this.issuer = new Openid4vciIssuer({
            callbacks,
        });
        this.resourceServer = new Oauth2ResourceServer({
            callbacks,
        });
    }

    async issuerMetadata(session: Session): Promise<IssuerMetadataResult> {
        const credential_issuer = `${this.configService.getOrThrow<string>(
            'PUBLIC_URL',
        )}/${session.id}`;

        const display = JSON.parse(
            readFileSync(
                join(
                    this.configService.getOrThrow<string>('FOLDER'),
                    session.tenantId,
                    'display.json',
                ),
                'utf-8',
            ),
        );

        const authorizationServerMetadata =
            this.authzService.authzMetadata(session);

        const issuanceConfig =
            await this.issuanceService.getIssuanceConfigurationById(
                session.issuanceId as string,
                session.tenantId,
            );

        let credentialIssuer = this.issuer.createCredentialIssuerMetadata({
            credential_issuer,
            credential_configurations_supported:
                await this.credentialsService.getCredentialConfigurationSupported(
                    session,
                    issuanceConfig,
                ),
            credential_endpoint: `${credential_issuer}/vci/credential`,
            authorization_servers: [authorizationServerMetadata.issuer],
            authorization_server: authorizationServerMetadata.issuer,
            notification_endpoint: `${credential_issuer}/vci/notification`,
            display,
        });

        if (issuanceConfig.batch_size) {
            credentialIssuer.batch_credential_issuance = {
                batch_size: issuanceConfig.batch_size,
            };
        }

        //replace placeholders in the issuer metadata
        credentialIssuer = JSON.parse(
            JSON.stringify(credentialIssuer).replace(
                /<PUBLIC_URL>/g,
                this.configService.getOrThrow<string>('PUBLIC_URL'),
            ),
        );

        return {
            credentialIssuer,
            authorizationServers: [authorizationServerMetadata],
            originalDraftVersion: Openid4vciDraftVersion.Draft14,
        } as const satisfies IssuerMetadataResult;
    }

    async createOffer(
        body: OfferRequestDto,
        user: TokenPayload,
        tenantId: string,
    ): Promise<OfferResponse> {
        const issuanceConfig = await this.issuanceService
            .getIssuanceConfigurationById(body.issuanceId, tenantId)
            .catch(() => {
                throw new BadRequestException(
                    `Issuance configuration with ID ${body.issuanceId} not found`,
                );
            });
        const credentialConfigurationIds =
            body.credentialConfigurationIds ||
            issuanceConfig.credentialIssuanceBindings.map(
                (config) => config.credentialConfigId,
            );

        let authorization_code: string | undefined;
        let grants: any;
        const issuer_state = v4();
        if (issuanceConfig.authenticationConfig.method === 'none') {
            authorization_code = v4();
            grants = {
                [preAuthorizedCodeGrantIdentifier]: {
                    'pre-authorized_code': authorization_code,
                },
            };
        } else {
            grants = {
                [authorizationCodeGrantIdentifier]: {
                    issuer_state,
                },
            };
        }

        const session = await this.sessionService.create({
            id: issuer_state,
            credentialPayload: body,
            tenantId: user.sub,
            issuanceId: body.issuanceId,
            authorization_code,
        });

        const issuerMetadata = await this.issuerMetadata(session);

        return this.issuer
            .createCredentialOffer({
                credentialConfigurationIds,
                grants,
                issuerMetadata,
            })
            .then(
                async (offer) => {
                    await this.sessionService.add(issuer_state, {
                        offer: offer.credentialOfferObject as any,
                    });
                    return {
                        session: issuer_state,
                        uri: offer.credentialOffer,
                    } as OfferResponse;
                },
                () => {
                    throw new ConflictException(
                        `Invalid credential configuration ID`,
                    );
                },
            );
    }

    async getCredential(
        req: Request,
        session: Session,
    ): Promise<CredentialResponse> {
        const issuerMetadata = await this.issuerMetadata(session);
        const parsedCredentialRequest = this.issuer.parseCredentialRequest({
            issuerMetadata,
            credentialRequest: req.body as Record<string, unknown>,
        });

        if (parsedCredentialRequest?.proofs?.jwt === undefined) {
            throw new Error('Invalid credential request');
        }

        const protocol = new URL(
            this.configService.getOrThrow<string>('PUBLIC_URL'),
        ).protocol;

        const headers = getHeadersFromRequest(req);
        const { tokenPayload } =
            await this.resourceServer.verifyResourceRequest({
                authorizationServers: issuerMetadata.authorizationServers,
                request: {
                    url: `${protocol}//${req.host}${req.url}`,
                    method: req.method as HttpMethod,
                    headers,
                },
                resourceServer:
                    issuerMetadata.credentialIssuer.credential_issuer,
                allowedAuthenticationSchemes: [
                    SupportedAuthenticationScheme.DPoP,
                ],
            });

        if (tokenPayload.sub !== session.id) {
            throw new BadRequestException('Session not found');
        }

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId: session.tenantId,
            flowType: 'OID4VCI',
            stage: 'credential_request',
        };

        this.sessionLogger.logFlowStart(logContext, {
            credentialConfigurationId:
                parsedCredentialRequest.credentialConfigurationId,
            proofCount: parsedCredentialRequest.proofs?.jwt?.length || 0,
        });

        try {
            const credentials: string[] = [];
            for (const jwt of parsedCredentialRequest.proofs.jwt) {
                const verifiedProof =
                    await this.issuer.verifyCredentialRequestJwtProof({
                        //check if this is correct or if the passed nonce is validated.
                        expectedNonce: tokenPayload.nonce as string,
                        issuerMetadata: await this.issuerMetadata(session),
                        jwt,
                    });
                const cnf = verifiedProof.signer.publicJwk;
                const cred = await this.credentialsService.getCredential(
                    parsedCredentialRequest.credentialConfigurationId as string,
                    cnf as any,
                    session,
                );
                credentials.push(cred);

                this.sessionLogger.logCredentialIssuance(
                    logContext,
                    parsedCredentialRequest.credentialConfigurationId as string,
                    {
                        credentialSize: cred.length,
                        proofVerified: true,
                    },
                );
            }

            const notificationId = v4();
            session.notifications.push({
                id: notificationId,
                credentialConfigurationId:
                    parsedCredentialRequest.credentialConfigurationId as string,
            });
            await this.sessionService.add(session.id, {
                notifications: session.notifications,
            });

            this.sessionLogger.logFlowComplete(logContext, {
                credentialsIssued: credentials.length,
                notificationId,
            });

            return this.issuer.createCredentialResponse({
                credentials,
                credentialRequest: parsedCredentialRequest,
                cNonce: tokenPayload.nonce as string,
                cNonceExpiresInSeconds: 3600,
                //this should be stored in the session in case this endpoint is requested multiple times, but the response is differnt.
                notificationId,
            });
        } catch (error) {
            this.sessionLogger.logFlowError(logContext, error as Error, {
                credentialConfigurationId:
                    parsedCredentialRequest.credentialConfigurationId,
            });
            throw error;
        }
    }

    /**
     * Store the notification in the session based on the notitification id.
     * @param req
     * @param body
     */
    async handleNotification(
        req: Request,
        body: NotificationRequestDto,
        session: Session,
    ) {
        const issuerMetadata = await this.issuerMetadata(session);
        const headers = getHeadersFromRequest(req);
        const protocol = new URL(
            this.configService.getOrThrow<string>('PUBLIC_URL'),
        ).protocol;
        const { tokenPayload } =
            await this.resourceServer.verifyResourceRequest({
                authorizationServers: issuerMetadata.authorizationServers,
                request: {
                    url: `${protocol}//${req.host}${req.url}`,
                    method: req.method as HttpMethod,
                    headers,
                },
                resourceServer:
                    issuerMetadata.credentialIssuer.credential_issuer,
                allowedAuthenticationSchemes: [
                    SupportedAuthenticationScheme.DPoP,
                ],
            });

        if (session.id !== tokenPayload.sub) {
            throw new BadRequestException('Session not found');
        }

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId: session.tenantId,
            flowType: 'OID4VCI',
            stage: 'notification',
        };

        try {
            const index = session.notifications.findIndex(
                (notification) => notification.id === body.notification_id,
            );
            if (index === -1) {
                throw new BadRequestException(
                    'No notifications found in session',
                );
            }

            session.notifications[index].event = body.event;
            await this.sessionService.add(session.id, {
                notifications: session.notifications,
            });

            this.sessionLogger.logNotification(logContext, body.event || '', {
                notificationId: body.notification_id,
                notificationIndex: index,
            });

            //check for the webhook and send it.
            //TODO: in case multiple batches are included, check if each time the notification endpoint is triggered. Also when multiple credentials got offered in the request, try to bundle them maybe?
            if (session.notifyWebhook) {
                await this.webhookService.sendWebhookNotification(
                    session,
                    logContext,
                    session.notifications[index],
                );
            }
            const state: SessionStatus =
                body.event === 'credential_accepted' ? 'completed' : 'failed';
            await this.sessionService.setState(session, state);
        } catch (error) {
            this.sessionLogger.logSessionError(
                logContext,
                error as Error,
                'Failed to handle notification',
                {
                    notificationId: body.notification_id,
                },
            );
            throw error;
        }
    }
}
