import { HttpService } from "@nestjs/axios";
import {
    BadRequestException,
    ConflictException,
    Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import {
    AuthorizationServerMetadata,
    authorizationCodeGrantIdentifier,
    type HttpMethod,
    Oauth2ResourceServer,
    preAuthorizedCodeGrantIdentifier,
    SupportedAuthenticationScheme,
} from "@openid4vc/oauth2";
import {
    type CredentialResponse,
    type IssuerMetadataResult,
    Openid4vciDraftVersion,
    Openid4vciIssuer,
} from "@openid4vc/openid4vci";
import type { Request } from "express";
import { decodeJwt } from "jose";
import { firstValueFrom } from "rxjs";
import { LessThan, Repository } from "typeorm";
import { v4 } from "uuid";
import { TokenPayload } from "../../auth/token.decorator";
import { CryptoService } from "../../crypto/crypto.service";
import { SessionStatus } from "../../session/entities/session.entity";
import { SessionService } from "../../session/session.service";
import { SessionLoggerService } from "../../utils/logger/session-logger.service";
import { SessionLogContext } from "../../utils/logger/session-logger-context";
import { WebhookService } from "../../utils/webhook/webhook.service";
import { AuthorizeService } from "../authorize/authorize.service";
import { CredentialsService } from "../credentials/credentials.service";
import { IssuanceService } from "../issuance/issuance.service";
import { NotificationRequestDto } from "./dto/notification-request.dto";
import {
    FlowType,
    OfferRequestDto,
    OfferResponse,
} from "./dto/offer-request.dto";
import { NonceEntity } from "./entities/nonces.entity";
import { getHeadersFromRequest } from "./util";

/**
 * Service for handling OID4VCI (OpenID 4 Verifiable Credential Issuance) operations.
 */
@Injectable()
export class Oid4vciService {
    constructor(
        private readonly authzService: AuthorizeService,
        private readonly cryptoService: CryptoService,
        public readonly credentialsService: CredentialsService,
        private readonly configService: ConfigService,
        private readonly sessionService: SessionService,
        private readonly sessionLogger: SessionLoggerService,
        private readonly issuanceService: IssuanceService,
        private readonly webhookService: WebhookService,
        private readonly httpService: HttpService,
        @InjectRepository(NonceEntity)
        private nonceRepository: Repository<NonceEntity>,
    ) {}

    /**
     * Get the OID4VCI issuer instance for a specific tenant.
     * @param tenantId The ID of the tenant.
     * @returns The OID4VCI issuer instance.
     */
    getIssuer(tenantId: string) {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
        return new Openid4vciIssuer({
            callbacks,
        });
    }

    /**
     * Get the OID4VCI resource server instance for a specific tenant.
     * @param tenantId The ID of the tenant.
     * @returns The OID4VCI resource server instance.
     */
    getResourceServer(tenantId: string) {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
        return new Oauth2ResourceServer({
            callbacks,
        });
    }

    /**
     * Get the OID4VCI issuer metadata for a specific session.
     * @param session The session for which to retrieve the issuer metadata.
     * @returns The OID4VCI issuer metadata.
     */
    async issuerMetadata(
        tenantId: string,
        issuer?: Openid4vciIssuer,
    ): Promise<IssuerMetadataResult> {
        if (!issuer) {
            issuer = this.getIssuer(tenantId);
        }

        const credential_issuer = `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${tenantId}`;

        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        let authorizationServerMetadata: AuthorizationServerMetadata;
        let authServers: string[] = [];

        if (
            issuanceConfig.authServers &&
            issuanceConfig.authServers.length > 0
        ) {
            authServers = issuanceConfig.authServers;
            authorizationServerMetadata = await firstValueFrom(
                this.httpService.get(
                    `${issuanceConfig.authServers}/.well-known/oauth-authorization-server`,
                ),
            ).then(
                (response) => response.data,
                async (err) => {
                    // Retry fetching from OIDC metadata endpoint
                    return await firstValueFrom(
                        this.httpService.get(
                            `${issuanceConfig.authServers}/.well-known/openid-configuration`,
                        ),
                    ).then(
                        (response) => response.data,
                        () => {
                            throw new BadRequestException(
                                "Failed to fetch authorization server metadata",
                            );
                        },
                    );
                },
            );
        } else {
            authServers.push(
                this.configService.getOrThrow<string>("PUBLIC_URL") +
                    `/${tenantId}`,
            );
            authorizationServerMetadata =
                await this.authzService.authzMetadata(tenantId);
        }
        try {
            const credentialIssuer = issuer.createCredentialIssuerMetadata({
                credential_issuer,
                credential_configurations_supported:
                    await this.credentialsService.getCredentialConfigurationSupported(
                        tenantId,
                    ),
                credential_endpoint: `${credential_issuer}/vci/credential`,
                authorization_servers: authServers,
                authorization_server: authServers[0],
                notification_endpoint: `${credential_issuer}/vci/notification`,
                nonce_endpoint: `${credential_issuer}/vci/nonce`,
                display: issuanceConfig.display as any,
                batch_credential_issuance: issuanceConfig?.batchSize
                    ? {
                          batch_size: issuanceConfig?.batchSize,
                      }
                    : undefined,
            });
            return {
                credentialIssuer,
                authorizationServers: [authorizationServerMetadata],
                originalDraftVersion: Openid4vciDraftVersion.Draft15,
            } as IssuerMetadataResult;
        } catch (error) {
            console.log("Error creating credential issuer metadata", error);
            throw error;
        }
    }

    /**
     * Create a credential offer for a specific user and tenant.
     * @param body The request body containing the offer details.
     * @param user The user for whom the offer is being created.
     * @param tenantId The ID of the tenant.
     * @returns The created credential offer.
     */
    async createOffer(
        body: OfferRequestDto,
        user: TokenPayload,
        tenantId: string,
    ): Promise<OfferResponse> {
        const credentialConfigurationIds = body.credentialConfigurationIds;

        let authorization_code: string | undefined;
        let grants: any;
        const issuer_state = v4();
        if (body.flow === FlowType.PRE_AUTH_CODE) {
            authorization_code = v4();
            grants = {
                [preAuthorizedCodeGrantIdentifier]: {
                    "pre-authorized_code": authorization_code,
                },
            };
        } else {
            grants = {
                [authorizationCodeGrantIdentifier]: {
                    issuer_state,
                },
            };
        }

        //if claims are provided, check them against the schemas when provided
        if (body.claims) {
            Promise.all(
                Object.keys(body.claims).map((credentialConfigId) =>
                    this.credentialsService.validateClaimsForCredential(
                        credentialConfigId,
                        body.claims![credentialConfigId],
                    ),
                ),
            );
        }

        const session = await this.sessionService.create({
            id: issuer_state,
            credentialPayload: body,
            tenantId: user.entity!.id,
            authorization_code,
            claimsWebhook: body.claimWebhook,
            notifyWebhook: body.notifyWebhook,
        });

        const issuer = this.getIssuer(session.tenantId);
        const issuerMetadata = await this.issuerMetadata(tenantId, issuer);

        return issuer
            .createCredentialOffer({
                credentialConfigurationIds,
                grants,
                issuerMetadata,
            })
            .then(
                async (offer) => {
                    await this.sessionService.add(issuer_state, {
                        offer: offer.credentialOfferObject as any,
                        offerUrl: offer.credentialOffer,
                    });
                    return {
                        session: session.id,
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

    /**
     * Create a nonce an store it in the session entity
     * @param session
     * @returns
     */
    async nonceRequest(tenantId: string) {
        const nonce = v4();
        await this.nonceRepository.save({
            nonce,
            tenantId,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });
        return nonce;
    }

    /**
     * Cleanup expired nonces from the database.
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    nonceCleanup() {
        const now = new Date();
        this.nonceRepository.delete({
            expiresAt: LessThan(now),
        });
    }

    /**
     * Get a credential for a specific session.
     * @param req
     * @param session
     * @returns
     */
    async getCredential(
        req: Request,
        tenantId: string,
    ): Promise<CredentialResponse> {
        const issuer = this.getIssuer(tenantId);
        const issuerMetadata = await this.issuerMetadata(tenantId, issuer);
        const resourceServer = this.getResourceServer(tenantId);
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        let parsedCredentialRequest;
        const known = issuer.getKnownCredentialConfigurationsSupported(
            issuerMetadata.credentialIssuer,
        );
        issuerMetadata.knownCredentialConfigurations = known;
        try {
            parsedCredentialRequest = issuer.parseCredentialRequest({
                issuerMetadata,
                credentialRequest: req.body as Record<string, unknown>,
            });
        } catch (error) {
            console.log(error);
            throw new ConflictException("Invalid credential request");
        }

        if (parsedCredentialRequest?.proofs?.jwt === undefined) {
            throw new Error("Invalid credential request");
        }

        const protocol = new URL(
            this.configService.getOrThrow<string>("PUBLIC_URL"),
        ).protocol;

        const headers = getHeadersFromRequest(req);

        const allowedAuthenticationSchemes = [
            SupportedAuthenticationScheme.DPoP,
        ];

        if (!issuanceConfig.dPopRequired) {
            allowedAuthenticationSchemes.push(
                SupportedAuthenticationScheme.Bearer,
            );
        }
        //TODO: check how the nonce for the dpop has to be passed
        const { tokenPayload } = await resourceServer.verifyResourceRequest({
            authorizationServers: issuerMetadata.authorizationServers,
            request: {
                url: `${protocol}//${req.host}${req.url}`,
                method: req.method as HttpMethod,
                headers,
            },
            //TODO: Keycloak is setting aud to `account`, but it should be the value of resource server
            resourceServer: issuerMetadata.credentialIssuer.credential_issuer,
            allowedAuthenticationSchemes,
        });
        const session = await this.sessionService.getBy({
            id: tokenPayload.sub,
        });

        if (tokenPayload.sub !== session.id) {
            throw new BadRequestException("Session not found");
        }

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId,
            flowType: "OID4VCI",
            stage: "credential_request",
        };

        this.sessionLogger.logFlowStart(logContext, {
            credentialConfigurationId:
                parsedCredentialRequest.credentialConfigurationId,
            proofCount: parsedCredentialRequest.proofs?.jwt?.length || 0,
        });

        try {
            const credentials: { credential: string }[] = [];
            // if a webhook is provided, fetch the data from it.

            const claims: Record<string, Record<string, unknown>> | undefined =
                undefined;
            /*             if (
                issuanceConfig.claimsWebhook &&
                issuanceConfig.authenticationConfig.method !==
                    "presentationDuringIssuance"
            ) {
                claims = await this.webhookService.sendWebhook(
                    session,
                    logContext,
                );
            } */

            for (const jwt of parsedCredentialRequest.proofs.jwt) {
                // check if the nonce was requested before and delete it
                const payload = decodeJwt(jwt);
                const expectedNonce = payload.nonce! as string;
                //check if nonce was requested before and delete it
                const nonceResult = await this.nonceRepository.delete({
                    nonce: expectedNonce,
                    tenantId,
                });
                if (nonceResult.affected === 0) {
                    this.sessionLogger.logFlowError(
                        logContext,
                        new ConflictException(
                            "Nonce not found or already deleted",
                        ),
                        {
                            credentialConfigurationId:
                                parsedCredentialRequest.credentialConfigurationId,
                        },
                    );
                }

                const verifiedProof =
                    await issuer.verifyCredentialRequestJwtProof({
                        //check if this is correct or if the passed nonce is validated.
                        expectedNonce,
                        issuerMetadata: await this.issuerMetadata(
                            session.tenantId,
                        ),
                        jwt,
                    });
                const cnf = verifiedProof.signer.publicJwk;
                const cred = await this.credentialsService.getCredential(
                    parsedCredentialRequest.credentialConfigurationId as string,
                    cnf as any,
                    session,
                    claims,
                );
                credentials.push({
                    credential: cred,
                });

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
                status: SessionStatus.Fetched,
            });

            this.sessionLogger.logFlowComplete(logContext, {
                credentialsIssued: credentials.length,
                notificationId,
            });

            return issuer.createCredentialResponse({
                credentials,
                credentialRequest: parsedCredentialRequest,
                cNonce: tokenPayload.nonce as string,
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
        const issuer = this.getIssuer(tenantId);
        const resourceServer = this.getResourceServer(tenantId);
        const issuerMetadata = await this.issuerMetadata(tenantId, issuer);
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);
        const headers = getHeadersFromRequest(req);
        const protocol = new URL(
            this.configService.getOrThrow<string>("PUBLIC_URL"),
        ).protocol;

        const allowedAuthenticationSchemes: SupportedAuthenticationScheme[] = [
            SupportedAuthenticationScheme.DPoP,
        ];
        if (!issuanceConfig.dPopRequired) {
            allowedAuthenticationSchemes.push(
                SupportedAuthenticationScheme.Bearer,
            );
        }

        const { tokenPayload } = await resourceServer.verifyResourceRequest({
            authorizationServers: issuerMetadata.authorizationServers,
            request: {
                url: `${protocol}//${req.host}${req.url}`,
                method: req.method as HttpMethod,
                headers,
            },
            resourceServer: issuerMetadata.credentialIssuer.credential_issuer,
            allowedAuthenticationSchemes,
        });

        const session = await this.sessionService.getBy({
            id: tokenPayload.sub,
        });

        if (session.id !== tokenPayload.sub) {
            throw new BadRequestException("Session not found");
        }

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId,
            flowType: "OID4VCI",
            stage: "notification",
        };

        try {
            const index = session.notifications.findIndex(
                (notification) => notification.id === body.notification_id,
            );
            if (index === -1) {
                throw new BadRequestException(
                    "No notifications found in session",
                );
            }

            session.notifications[index].event = body.event;
            await this.sessionService.add(session.id, {
                notifications: session.notifications,
            });

            this.sessionLogger.logNotification(logContext, body.event || "", {
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
                body.event === "credential_accepted"
                    ? SessionStatus.Completed
                    : SessionStatus.Failed;
            await this.sessionService.setState(session, state);
        } catch (error) {
            this.sessionLogger.logSessionError(
                logContext,
                error as Error,
                "Failed to handle notification",
                {
                    notificationId: body.notification_id,
                },
            );
            throw error;
        }
    }
}
