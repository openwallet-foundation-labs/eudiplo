import { readFileSync } from "node:fs";
import { join } from "node:path";
import { HttpService } from "@nestjs/axios";
import {
    BadRequestException,
    ConflictException,
    Injectable,
    OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
import { firstValueFrom } from "rxjs";
import { Repository } from "typeorm/repository/Repository";
import { v4 } from "uuid";
import { TokenPayload } from "../../auth/token.decorator";
import { CryptoService } from "../../crypto/crypto.service";
import { Session, SessionStatus } from "../../session/entities/session.entity";
import { SessionService } from "../../session/session.service";
import { SessionLoggerService } from "../../utils/logger/session-logger.service";
import { SessionLogContext } from "../../utils/logger/session-logger-context";
import { WebhookService } from "../../utils/webhook/webhook.service";
import { AuthorizeService } from "../authorize/authorize.service";
import { CredentialsService } from "../credentials/credentials.service";
import { AuthenticationConfigHelper } from "../issuance/dto/authentication-config.helper";
import { IssuanceService } from "../issuance/issuance.service";
import { NotificationRequestDto } from "./dto/notification-request.dto";
import { OfferRequestDto, OfferResponse } from "./dto/offer-request.dto";
import { DisplayEntity } from "./entities/display.entity";
import { getHeadersFromRequest } from "./util";

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
        private readonly httpService: HttpService,
        @InjectRepository(DisplayEntity)
        private readonly displayRepository: Repository<DisplayEntity>,
    ) {}
    onModuleInit() {
        //TODO: align for tenant
        const callbacks = this.cryptoService.getCallbackContext("");
        this.issuer = new Openid4vciIssuer({
            callbacks,
        });
        this.resourceServer = new Oauth2ResourceServer({
            callbacks,
        });
    }

    onTenantInit(tenantId: string) {
        return this.displayRepository.save({
            tenantId,
            value: [
                {
                    name: "EUDI Wallet dev",
                    locale: "de-DE",
                    logo: {
                        uri: "<PUBLIC_URL>/issuer.png",
                        url: "<PUBLIC_URL>/issuer.png",
                    },
                },
            ],
        });
    }

    async issuerMetadata(session: Session): Promise<IssuerMetadataResult> {
        const credential_issuer = `${this.configService.getOrThrow<string>(
            "PUBLIC_URL",
        )}/${session.id}`;

        const display = await this.displayRepository
            .findOneByOrFail({
                tenantId: session.tenantId,
            })
            .then((res) => res.value);

        const issuanceConfig =
            await this.issuanceService.getIssuanceConfigurationById(
                session.issuanceId as string,
                session.tenantId,
            );

        let authorizationServerMetadata: AuthorizationServerMetadata;

        let authServer: string;

        if (
            AuthenticationConfigHelper.isAuthUrlAuth(
                issuanceConfig.authenticationConfig,
            )
        ) {
            authServer = issuanceConfig.authenticationConfig.config.url;
            // fetch the authorization server metadata
            authorizationServerMetadata = await firstValueFrom(
                this.httpService.get(
                    `${authServer}/.well-known/oauth-authorization-server`,
                ),
            ).then(
                (response) => response.data,
                (err) => {
                    const logContext: SessionLogContext = {
                        sessionId: session.id,
                        tenantId: session.tenantId,
                        flowType: "OID4VCI",
                        stage: "credential_request",
                    };
                    this.sessionLogger.logFlowError(logContext, err);
                    throw new BadRequestException(
                        "Failed to fetch authorization server metadata",
                    );
                },
            );
        } else {
            authServer =
                this.configService.getOrThrow<string>("PUBLIC_URL") +
                `/${session.id}`;
            authorizationServerMetadata =
                this.authzService.authzMetadata(session);
        }

        let credentialIssuer = this.issuer.createCredentialIssuerMetadata({
            credential_issuer,
            credential_configurations_supported:
                await this.credentialsService.getCredentialConfigurationSupported(
                    session,
                    issuanceConfig,
                ),
            credential_endpoint: `${credential_issuer}/vci/credential`,
            authorization_servers: [authServer],
            authorization_server: authServer,
            notification_endpoint: `${credential_issuer}/vci/notification`,
            nonce_endpoint: `${credential_issuer}/vci/nonce`,
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
                this.configService.getOrThrow<string>("PUBLIC_URL"),
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
        const issuer_state = body.session ?? v4();
        if (issuanceConfig.authenticationConfig.method === "none") {
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
                        offerUrl: offer.credentialOffer,
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

    /**
     * Create a nonce an store it in the session entity
     * @param session
     * @returns
     */
    async nonceRequest(session: Session) {
        const nonce = v4();
        await this.sessionService.add(session.id, { nonce });
        return {
            c_nonce: nonce,
        };
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
            throw new Error("Invalid credential request");
        }

        const protocol = new URL(
            this.configService.getOrThrow<string>("PUBLIC_URL"),
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
                //TODO: Keycloak is setting aud to `account`, but it should be the value of resource server
                resourceServer:
                    issuerMetadata.credentialIssuer.credential_issuer,
                allowedAuthenticationSchemes: [
                    SupportedAuthenticationScheme.DPoP,
                    SupportedAuthenticationScheme.Bearer,
                ],
            });

        if (tokenPayload.sub !== session.id) {
            throw new BadRequestException("Session not found");
        }

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId: session.tenantId,
            flowType: "OID4VCI",
            stage: "credential_request",
        };

        this.sessionLogger.logFlowStart(logContext, {
            credentialConfigurationId:
                parsedCredentialRequest.credentialConfigurationId,
            proofCount: parsedCredentialRequest.proofs?.jwt?.length || 0,
        });

        try {
            const credentials: string[] = [];
            const expectedNonce =
                (tokenPayload.nonce as string) || session.nonce;
            if (expectedNonce === undefined) {
                throw new BadRequestException("Nonce not found");
            }
            for (const jwt of parsedCredentialRequest.proofs.jwt) {
                const verifiedProof =
                    await this.issuer.verifyCredentialRequestJwtProof({
                        //check if this is correct or if the passed nonce is validated.
                        expectedNonce,
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
                status: SessionStatus.Fetched,
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
            this.configService.getOrThrow<string>("PUBLIC_URL"),
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
            throw new BadRequestException("Session not found");
        }

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId: session.tenantId,
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
