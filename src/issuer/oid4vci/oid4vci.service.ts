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
} from '@openid4vc/oauth2';
import {
    type CredentialResponse,
    type IssuerMetadataResult,
    Openid4vciDraftVersion,
    Openid4vciIssuer,
} from '@openid4vc/openid4vci';
import type { Request } from 'express';
import { CredentialsService } from '../../issuer/credentials/credentials.service';
import { CryptoService } from '../../crypto/crypto.service';
import { AuthorizeService } from '../authorize/authorize.service';
import { getHeadersFromRequest } from './util';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SessionService } from '../../session/session.service';
import { v4 } from 'uuid';
import { OfferRequest, OfferResponse } from './dto/offer-request.dto';
import { NotificationRequestDto } from './dto/notification-request.dto';
import { SessionLoggerService } from '../../utils/session-logger.service';
import { SessionLogContext } from '../../utils/session-logger-context';
import { TokenPayload } from '../../auth/token.decorator';

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

    async issuerMetadata(tenantId: string): Promise<IssuerMetadataResult> {
        const credential_issuer = `${this.configService.getOrThrow<string>(
            'PUBLIC_URL',
        )}/${tenantId}`;

        const display = JSON.parse(
            readFileSync(
                join(
                    this.configService.getOrThrow<string>('FOLDER'),
                    tenantId,
                    'display.json',
                ),
                'utf-8',
            ),
        );

        const authorizationServerMetadata =
            this.authzService.authzMetadata(tenantId);

        let credentialIssuer = this.issuer.createCredentialIssuerMetadata({
            credential_issuer,
            credential_configurations_supported:
                await this.credentialsService.getCredentialConfiguration(
                    tenantId,
                ),
            credential_endpoint: `${credential_issuer}/vci/credential`,
            authorization_servers: [authorizationServerMetadata.issuer],
            authorization_server: authorizationServerMetadata.issuer,
            notification_endpoint: `${credential_issuer}/vci/notification`,
            batch_credential_issuance: {
                batch_size: 1,
            },
            display,
        });

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
        body: OfferRequest,
        user: TokenPayload,
        tenantId: string,
    ): Promise<OfferResponse> {
        const configs =
            await this.credentialsService.getCredentialConfiguration(user.sub);
        body.credentialConfigurationIds.map((id) => {
            if (configs[id] === undefined) {
                throw new ConflictException(
                    'Invalid credential configuration ID',
                );
            }
        });

        const issuerMetadata = await this.issuerMetadata(tenantId);
        const issuer_state = v4();
        return this.issuer
            .createCredentialOffer({
                credentialConfigurationIds: body.credentialConfigurationIds,
                grants: {
                    [authorizationCodeGrantIdentifier]: {
                        issuer_state,
                    },
                },
                issuerMetadata,
            })
            .then(async (offer) => {
                await this.sessionService.create({
                    id: issuer_state,
                    offer: offer.credentialOfferObject,
                    credentialPayload: body,
                    tenantId: user.sub,
                });
                return {
                    session: issuer_state,
                    uri: offer.credentialOffer,
                } as OfferResponse;
            });
    }

    async getCredential(
        req: Request,
        tenantId: string,
    ): Promise<CredentialResponse> {
        const issuerMetadata = await this.issuerMetadata(tenantId);
        const parsedCredentialRequest = this.issuer.parseCredentialRequest({
            issuerMetadata,
            credentialRequest: req.body as Record<string, unknown>,
        });

        if (parsedCredentialRequest?.proofs?.jwt === undefined) {
            throw new Error('Invalid credential request');
        }

        const headers = getHeadersFromRequest(req);
        const { tokenPayload } =
            await this.resourceServer.verifyResourceRequest({
                authorizationServers: issuerMetadata.authorizationServers,
                request: {
                    url: `https://${req.host}${req.url}`,
                    method: req.method as HttpMethod,
                    headers,
                },
                resourceServer:
                    issuerMetadata.credentialIssuer.credential_issuer,
                allowedAuthenticationSchemes: [
                    SupportedAuthenticationScheme.DPoP,
                ],
            });

        const session = await this.sessionService.get(
            tokenPayload.sub as string,
        );

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId,
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
                        issuerMetadata: await this.issuerMetadata(tenantId),
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
            });
            await this.sessionService.add(session.id, tenantId, {
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
        tenantId: string,
    ) {
        const issuerMetadata = await this.issuerMetadata(tenantId);
        const headers = getHeadersFromRequest(req);
        const { tokenPayload } =
            await this.resourceServer.verifyResourceRequest({
                authorizationServers: issuerMetadata.authorizationServers,
                request: {
                    url: `https://${req.host}${req.url}`,
                    method: req.method as HttpMethod,
                    headers,
                },
                resourceServer:
                    issuerMetadata.credentialIssuer.credential_issuer,
                allowedAuthenticationSchemes: [
                    SupportedAuthenticationScheme.DPoP,
                ],
            });

        const session = await this.sessionService.get(
            tokenPayload.sub as string,
        );
        if (session === undefined) {
            throw new BadRequestException('Session not found');
        }

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId,
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
            session.notifications[index] = {
                id: body.notification_id,
                event: body.event,
            };
            await this.sessionService.add(session.id, tenantId, {
                notifications: session.notifications,
            });

            this.sessionLogger.logNotification(logContext, body.event || '', {
                notificationId: body.notification_id,
                notificationIndex: index,
            });
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
