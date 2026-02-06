import { HttpService } from "@nestjs/axios";
import {
    BadRequestException,
    ConflictException,
    Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import type { Jwk } from "@openid4vc/oauth2";
import {
    AuthorizationServerMetadata,
    authorizationCodeGrantIdentifier,
    type HttpMethod,
    Oauth2ResourceServer,
    preAuthorizedCodeGrantIdentifier,
    SupportedAuthenticationScheme,
} from "@openid4vc/oauth2";
import {
    CredentialOfferAuthorizationCodeGrant,
    type CredentialResponse,
    type IssuerMetadataResult,
    Openid4vciIssuer,
    Openid4vciVersion,
} from "@openid4vc/openid4vci";
import type { Request } from "express";
import { decodeJwt } from "jose";
import { firstValueFrom } from "rxjs";
import { LessThan, Repository } from "typeorm";
import { v4 } from "uuid";
import { TokenPayload } from "../../../auth/token.decorator";
import { CryptoService } from "../../../crypto/crypto.service";
import { SessionStatus } from "../../../session/entities/session.entity";
import { SessionService } from "../../../session/session.service";
import { SessionLoggerService } from "../../../shared/utils/logger/session-logger.service";
import { SessionLogContext } from "../../../shared/utils/logger/session-logger-context";
import { WebhookService } from "../../../shared/utils/webhook/webhook.service";
import {
    ClaimsWebhookResult,
    CredentialsService,
} from "../../configuration/credentials/credentials.service";
import { IssuanceService } from "../../configuration/issuance/issuance.service";
import { StatusListConfigService } from "../../lifecycle/status/status-list-config.service";
import { AuthorizeService } from "./authorize/authorize.service";
import { DeferredCredentialRequestDto } from "./dto/deferred-credential-request.dto";
import { NotificationRequestDto } from "./dto/notification-request.dto";
import {
    FlowType,
    OfferRequestDto,
    OfferResponse,
} from "./dto/offer-request.dto";
import {
    DeferredTransactionEntity,
    DeferredTransactionStatus,
} from "./entities/deferred-transaction.entity";
import { NonceEntity } from "./entities/nonces.entity";
import {
    CredentialRequestException,
    DeferredCredentialException,
} from "./exceptions";
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
        private readonly statusListConfigService: StatusListConfigService,
        @InjectRepository(NonceEntity)
        private readonly nonceRepository: Repository<NonceEntity>,
        @InjectRepository(DeferredTransactionEntity)
        private readonly deferredTransactionRepository: Repository<DeferredTransactionEntity>,
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
        issuer ??= this.getIssuer(tenantId);

        const credential_issuer = `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${tenantId}`;

        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        const authorizationServers: AuthorizationServerMetadata[] = [];
        let authServers: string[] = [];

        for (const authServerUrl of issuanceConfig.authServers || []) {
            authServers.push(authServerUrl);
            //TODO: check where this is needed to reduce calls
            authorizationServers.push(
                await firstValueFrom(
                    this.httpService.get(
                        `${authServerUrl}/.well-known/oauth-authorization-server`,
                    ),
                ).then(
                    (response) => response.data,
                    async () => {
                        // Retry fetching from OIDC metadata endpoint
                        return await firstValueFrom(
                            this.httpService.get(
                                `${authServerUrl}/.well-known/openid-configuration`,
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
                ),
            );
        }
        authServers.push(this.authzService.getAuthzIssuer(tenantId));
        authorizationServers.push(this.authzService.authzMetadata(tenantId));

        // Check if status list aggregation is enabled for this tenant
        const statusListConfig =
            await this.statusListConfigService.getEffectiveConfig(tenantId);
        const statusListAggregationEndpoint = statusListConfig.enableAggregation
            ? `${credential_issuer}/status-management/status-list-aggregation`
            : undefined;

        const credentialIssuer = issuer.createCredentialIssuerMetadata({
            credential_issuer,
            credential_configurations_supported:
                await this.credentialsService.getCredentialConfigurationSupported(
                    tenantId,
                ),
            credential_endpoint: `${credential_issuer}/vci/credential`,
            deferred_credential_endpoint: `${credential_issuer}/vci/deferred_credential`,
            authorization_servers: authServers,
            notification_endpoint: `${credential_issuer}/vci/notification`,
            nonce_endpoint: `${credential_issuer}/vci/nonce`,
            display: issuanceConfig.display as any,
            batch_credential_issuance:
                issuanceConfig?.batchSize && issuanceConfig?.batchSize > 1
                    ? {
                          batch_size: issuanceConfig?.batchSize,
                      }
                    : undefined,
            status_list_aggregation_endpoint: statusListAggregationEndpoint,
        });
        return {
            credentialIssuer,
            authorizationServers,
            originalDraftVersion: Openid4vciVersion.V1,
        } as IssuerMetadataResult;
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
            //check if tx_code is a number
            authorization_code = v4();
            grants = {
                [preAuthorizedCodeGrantIdentifier]: {
                    "pre-authorized_code": authorization_code,
                    tx_code: body.tx_code
                        ? {
                              input_mode: Number(body.tx_code)
                                  ? "numeric"
                                  : "text",
                              length: body.tx_code.length,
                              //TODO: should give the possiblity to pass a description
                          }
                        : undefined,
                    authorization_server:
                        body.authorization_server ??
                        this.authzService.getAuthzIssuer(tenantId),
                },
            };
        } else {
            grants = {
                [authorizationCodeGrantIdentifier]: {
                    issuer_state,
                    authorization_server:
                        body.authorization_server ??
                        this.authzService.getAuthzIssuer(tenantId),
                } as CredentialOfferAuthorizationCodeGrant,
            };
        }

        //if claims are provided, check them against the schemas when provided
        if (body.credentialClaims) {
            Promise.all(
                Object.entries(body.credentialClaims).map(
                    ([credentialConfigId, claimSource]) => {
                        if (claimSource.type === "inline") {
                            return this.credentialsService.validateClaimsForCredential(
                                credentialConfigId,
                                claimSource.claims,
                            );
                        }
                        return Promise.resolve();
                    },
                ),
            );
        }

        const session = await this.sessionService.create({
            id: issuer_state,
            credentialPayload: body,
            tenantId: user.entity!.id,
            authorization_code,
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
        } catch (err) {
            // OID4VCI spec Section 8.3.1.2: invalid_credential_request
            throw new CredentialRequestException(
                "invalid_credential_request",
                err instanceof Error
                    ? err.message
                    : "The Credential Request is malformed or missing required parameters",
            );
        }

        if (parsedCredentialRequest?.proofs?.jwt === undefined) {
            // OID4VCI spec Section 8.3.1.2: invalid_proof
            throw new CredentialRequestException(
                "invalid_proof",
                "The proofs parameter is missing or does not contain required JWT proofs",
            );
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
                url: `${this.configService.getOrThrow<string>("PUBLIC_URL")}${req.url}`,
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
            // OID4VCI spec Section 8.3.1.2: credential_request_denied
            throw new CredentialRequestException(
                "credential_request_denied",
                "The access token is not associated with a valid session",
            );
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

            //get the claims from webhook if configured
            const claimsResult =
                await this.credentialsService.getClaimsFromWebhook(
                    parsedCredentialRequest.credentialConfigurationId as string,
                    session,
                );

            // Check if the webhook indicated deferred issuance
            if (claimsResult?.deferred) {
                return this.handleDeferredIssuance(
                    parsedCredentialRequest,
                    session,
                    tenantId,
                    claimsResult,
                    logContext,
                );
            }

            // OID4VCI spec Section 13.8: A Wallet can continue using a given nonce until
            // it is rejected by the Credential Issuer.
            // For batch issuance (multiple proofs), all proofs typically use the same nonce.
            // We collect unique nonces and validate/consume them once before processing proofs.
            const uniqueNonces = new Set<string>();
            for (const jwt of parsedCredentialRequest.proofs.jwt) {
                const payload = decodeJwt(jwt);
                if (payload.nonce) {
                    uniqueNonces.add(payload.nonce as string);
                }
            }

            // Validate and consume all unique nonces upfront
            for (const nonce of uniqueNonces) {
                const nonceResult = await this.nonceRepository.delete({
                    nonce,
                    tenantId,
                });
                if (nonceResult.affected === 0) {
                    // OID4VCI spec Section 8.3.1.2: invalid_nonce
                    const nonceError = new CredentialRequestException(
                        "invalid_nonce",
                        "The nonce in the key proof is invalid or has already been used",
                    );
                    this.sessionLogger.logFlowError(logContext, nonceError, {
                        credentialConfigurationId:
                            parsedCredentialRequest.credentialConfigurationId,
                    });
                    throw nonceError;
                }
            }

            for (const jwt of parsedCredentialRequest.proofs.jwt) {
                const payload = decodeJwt(jwt);
                const expectedNonce = payload.nonce! as string;

                const verifiedProof =
                    await issuer.verifyCredentialRequestJwtProof({
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
                    claimsResult?.claims,
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

            // If it's already a CredentialRequestException, re-throw it
            if (error instanceof CredentialRequestException) {
                throw error;
            }

            // Check for credential configuration not found
            if (
                error instanceof ConflictException &&
                (error.message?.includes("not found") ||
                    error.message?.includes("Credential configuration"))
            ) {
                throw new CredentialRequestException(
                    "unknown_credential_configuration",
                    error.message,
                );
            }

            // Check for proof verification errors
            if (
                error instanceof Error &&
                (error.message?.toLowerCase().includes("proof") ||
                    error.message?.toLowerCase().includes("signature") ||
                    error.message?.toLowerCase().includes("jwt"))
            ) {
                throw new CredentialRequestException(
                    "invalid_proof",
                    error.message,
                );
            }

            // Default: credential_request_denied for unrecoverable errors
            throw new CredentialRequestException(
                "credential_request_denied",
                error instanceof Error
                    ? error.message
                    : "An unexpected error occurred",
            );
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
                url: `${this.configService.getOrThrow<string>("PUBLIC_URL")}${req.url}`,
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

    /**
     * Handle deferred credential issuance.
     * Creates a deferred transaction and returns HTTP 202 with transaction_id.
     * @param parsedCredentialRequest The parsed credential request
     * @param session The session
     * @param tenantId The tenant ID
     * @param claimsResult The claims webhook result indicating deferral
     * @param logContext The logging context
     * @returns A deferred credential response
     */
    private async handleDeferredIssuance(
        parsedCredentialRequest: any,
        session: any,
        tenantId: string,
        claimsResult: ClaimsWebhookResult,
        logContext: SessionLogContext,
    ): Promise<{
        transaction_id: string;
        interval?: number;
    }> {
        // For deferred issuance, we need to store the holder's proof(s) for later verification
        // We'll verify the first proof and store the CNF for when the credential is ready
        const issuer = this.getIssuer(tenantId);

        // Verify the first proof to get the holder's public key
        const jwt = parsedCredentialRequest.proofs.jwt[0];
        const payload = decodeJwt(jwt);
        const expectedNonce = payload.nonce! as string;

        // Delete the nonce to prevent reuse
        const nonceResult = await this.nonceRepository.delete({
            nonce: expectedNonce,
            tenantId,
        });
        if (nonceResult.affected === 0) {
            throw new CredentialRequestException(
                "invalid_nonce",
                "The nonce in the key proof is invalid or has already been used",
            );
        }

        const verifiedProof = await issuer.verifyCredentialRequestJwtProof({
            expectedNonce,
            issuerMetadata: await this.issuerMetadata(session.tenantId),
            jwt,
        });

        const transactionId = v4();
        const interval = claimsResult.interval ?? 5;

        // Calculate expiration (default 24 hours)
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        // Create deferred transaction record
        const deferredTransaction = this.deferredTransactionRepository.create({
            transactionId,
            tenantId,
            sessionId: session.id,
            credentialConfigurationId:
                parsedCredentialRequest.credentialConfigurationId as string,
            holderCnf: verifiedProof.signer.publicJwk as Record<
                string,
                unknown
            >,
            status: DeferredTransactionStatus.Pending,
            interval,
            expiresAt,
        });

        await this.deferredTransactionRepository.save(deferredTransaction);

        this.sessionLogger.logSession(
            logContext,
            "Deferred credential issuance initiated",
            {
                transactionId,
                credentialConfigurationId:
                    parsedCredentialRequest.credentialConfigurationId,
                interval,
                expiresAt: expiresAt.toISOString(),
            },
        );

        // Return response with HTTP 202 (handled by controller)
        return {
            transaction_id: transactionId,
            interval,
        };
    }

    /**
     * Handle deferred credential request.
     * Called when wallet polls with transaction_id.
     * @param req The request
     * @param body The deferred credential request DTO
     * @param tenantId The tenant ID
     * @returns Credential response or issuance_pending error
     */
    async getDeferredCredential(
        req: Request,
        body: DeferredCredentialRequestDto,
        tenantId: string,
    ): Promise<CredentialResponse> {
        const issuer = this.getIssuer(tenantId);
        const resourceServer = this.getResourceServer(tenantId);
        const issuerMetadata = await this.issuerMetadata(tenantId, issuer);
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);
        const headers = getHeadersFromRequest(req);

        const allowedAuthenticationSchemes = [
            SupportedAuthenticationScheme.DPoP,
        ];

        if (!issuanceConfig.dPopRequired) {
            allowedAuthenticationSchemes.push(
                SupportedAuthenticationScheme.Bearer,
            );
        }

        // Verify the access token
        await resourceServer.verifyResourceRequest({
            authorizationServers: issuerMetadata.authorizationServers,
            request: {
                url: `${this.configService.getOrThrow<string>("PUBLIC_URL")}${req.url}`,
                method: req.method as HttpMethod,
                headers,
            },
            resourceServer: issuerMetadata.credentialIssuer.credential_issuer,
            allowedAuthenticationSchemes,
        });

        // Find the deferred transaction
        const deferredTransaction =
            await this.deferredTransactionRepository.findOneBy({
                transactionId: body.transaction_id,
                tenantId,
            });

        if (!deferredTransaction) {
            throw new DeferredCredentialException(
                "invalid_transaction_id",
                "The transaction_id is invalid or has expired",
            );
        }

        // Check if transaction has expired
        if (new Date() > deferredTransaction.expiresAt) {
            await this.deferredTransactionRepository.update(
                { transactionId: body.transaction_id },
                { status: DeferredTransactionStatus.Expired },
            );
            throw new DeferredCredentialException(
                "invalid_transaction_id",
                "The transaction has expired",
            );
        }

        // Create logging context
        const logContext: SessionLogContext = {
            sessionId: deferredTransaction.sessionId,
            tenantId,
            flowType: "OID4VCI",
            stage: "deferred_credential",
        };

        // Check the status of the deferred transaction
        switch (deferredTransaction.status) {
            case DeferredTransactionStatus.Pending:
                // Credential is still being processed
                this.sessionLogger.logSession(
                    logContext,
                    "Deferred credential still pending",
                    {
                        transactionId: body.transaction_id,
                        interval: deferredTransaction.interval,
                    },
                );
                throw new DeferredCredentialException(
                    "issuance_pending",
                    "The credential issuance is still pending",
                    deferredTransaction.interval,
                );

            case DeferredTransactionStatus.Failed:
                throw new DeferredCredentialException(
                    "invalid_transaction_id",
                    deferredTransaction.errorMessage ||
                        "The credential issuance has failed",
                );

            case DeferredTransactionStatus.Expired:
                throw new DeferredCredentialException(
                    "invalid_transaction_id",
                    "The transaction has expired",
                );

            case DeferredTransactionStatus.Retrieved:
                throw new DeferredCredentialException(
                    "invalid_transaction_id",
                    "The credential has already been retrieved",
                );

            case DeferredTransactionStatus.Ready:
                // Credential is ready - return it
                if (!deferredTransaction.credential) {
                    throw new DeferredCredentialException(
                        "invalid_transaction_id",
                        "Credential is marked as ready but not available",
                    );
                }

                // Mark as retrieved
                await this.deferredTransactionRepository.update(
                    { transactionId: body.transaction_id },
                    { status: DeferredTransactionStatus.Retrieved },
                );

                this.sessionLogger.logSession(
                    logContext,
                    "Deferred credential retrieved",
                    {
                        transactionId: body.transaction_id,
                        credentialConfigurationId:
                            deferredTransaction.credentialConfigurationId,
                    },
                );

                // Return the credential response directly
                // Per OID4VCI Section 9.2, the response has the same format as the Credential Response
                return {
                    credential: deferredTransaction.credential,
                } as CredentialResponse;

            default:
                throw new DeferredCredentialException(
                    "invalid_transaction_id",
                    "Unknown transaction status",
                );
        }
    }

    /**
     * Mark a deferred transaction as ready with the issued credential.
     * This method is called when the external system completes processing.
     * @param tenantId The tenant ID
     * @param transactionId The transaction ID
     * @param claims The claims to include in the credential
     * @returns The updated deferred transaction
     */
    async completeDeferredTransaction(
        tenantId: string,
        transactionId: string,
        claims: Record<string, unknown>,
    ): Promise<DeferredTransactionEntity | null> {
        // Find the deferred transaction
        const transaction = await this.deferredTransactionRepository.findOneBy({
            transactionId,
            tenantId,
            status: DeferredTransactionStatus.Pending,
        });

        if (!transaction) {
            return null;
        }

        // Get the session to issue the credential
        const session = await this.sessionService.get(transaction.sessionId);
        if (!session) {
            throw new ConflictException(
                `Session ${transaction.sessionId} not found for deferred transaction ${transactionId}`,
            );
        }

        // Issue the credential
        const credential = await this.credentialsService.getCredential(
            transaction.credentialConfigurationId,
            transaction.holderCnf as Jwk,
            session,
            claims as Record<string, any>,
        );

        // Update the transaction
        await this.deferredTransactionRepository.update(
            { transactionId, tenantId },
            {
                status: DeferredTransactionStatus.Ready,
                credential,
            },
        );

        transaction.status = DeferredTransactionStatus.Ready;
        transaction.credential = credential;

        return transaction;
    }

    /**
     * Mark a deferred transaction as failed.
     * @param tenantId The tenant ID
     * @param transactionId The transaction ID
     * @param errorMessage Optional error message
     * @returns The updated deferred transaction
     */
    async failDeferredTransaction(
        tenantId: string,
        transactionId: string,
        errorMessage?: string,
    ): Promise<DeferredTransactionEntity | null> {
        // Find the deferred transaction
        const transaction = await this.deferredTransactionRepository.findOneBy({
            transactionId,
            tenantId,
        });

        if (!transaction) {
            return null;
        }

        await this.deferredTransactionRepository.update(
            { transactionId, tenantId },
            {
                status: DeferredTransactionStatus.Failed,
                errorMessage: errorMessage ?? "Transaction marked as failed",
            },
        );

        transaction.status = DeferredTransactionStatus.Failed;
        transaction.errorMessage =
            errorMessage ?? "Transaction marked as failed";

        return transaction;
    }

    /**
     * Cleanup expired deferred transactions.
     */
    @Cron(CronExpression.EVERY_HOUR)
    async cleanupExpiredDeferredTransactions() {
        await this.deferredTransactionRepository.delete({
            expiresAt: LessThan(new Date()),
        });
    }
}
