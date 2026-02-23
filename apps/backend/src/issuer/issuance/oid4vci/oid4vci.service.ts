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
    type Jwk,
    Oauth2ResourceServer,
    preAuthorizedCodeGrantIdentifier,
    SupportedAuthenticationScheme,
} from "@openid4vc/oauth2";
import {
    CreateCredentialResponseReturn,
    CredentialOfferAuthorizationCodeGrant,
    CredentialOfferPreAuthorizedCodeGrant,
    type CredentialResponse,
    DeferredCredentialResponse,
    type IssuerMetadataResult,
    Openid4vciIssuer,
    Openid4vciVersion,
    ParseCredentialRequestReturn,
} from "@openid4vc/openid4vci";
import type { Request } from "express";
import { decodeJwt } from "jose";
import { firstValueFrom } from "rxjs";
import { LessThan, Repository } from "typeorm";
import { v4 } from "uuid";
import { TokenPayload } from "../../../auth/token.decorator";
import { CryptoService } from "../../../crypto/crypto.service";
import {
    Session,
    SessionStatus,
} from "../../../session/entities/session.entity";
import { SessionService } from "../../../session/session.service";
import { SessionLoggerService } from "../../../shared/utils/logger/session-logger.service";
import { SessionLogContext } from "../../../shared/utils/logger/session-logger-context";
import { WebhookService } from "../../../shared/utils/webhook/webhook.service";
import { CredentialsService } from "../../configuration/credentials/credentials.service";
import { AuthorizationIdentity } from "../../configuration/credentials/dto/authorization-identity";
import { ClaimsWebhookResult } from "../../configuration/credentials/dto/claims-webhook-result";
import { IssuanceService } from "../../configuration/issuance/issuance.service";
import { StatusListConfigService } from "../../lifecycle/status/status-list-config.service";
import { AuthorizeService } from "./authorize/authorize.service";
import { ChainedAsService } from "./chained-as/chained-as.service";
import { DeferredCredentialService } from "./deferred-credential.service";
import { DeferredCredentialRequestDto } from "./dto/deferred-credential-request.dto";
import { NotificationRequestDto } from "./dto/notification-request.dto";
import {
    FlowType,
    OfferRequestDto,
    OfferResponse,
} from "./dto/offer-request.dto";
import { DeferredTransactionEntity } from "./entities/deferred-transaction.entity";
import { NonceEntity } from "./entities/nonces.entity";
import { CredentialRequestException } from "./exceptions";
import { getHeadersFromRequest } from "./util";

/**
 * Type alias for the OAuth2 access token payload returned by resource server verification.
 * This is distinct from the internal TokenPayload used for authenticated API requests.
 */
type OAuth2TokenPayload = {
    [x: string]: unknown;
    iss: string;
    exp: number;
    iat: number;
    aud: string | string[];
    sub: string;
    jti: string;
    client_id?: string;
    scope?: string;
    nbf?: number;
    nonce?: string;
    cnf?: { jwk?: Jwk };
};

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
        private readonly chainedAsService: ChainedAsService,
        private readonly deferredCredentialService: DeferredCredentialService,
        @InjectRepository(NonceEntity)
        private readonly nonceRepository: Repository<NonceEntity>,
    ) {}

    /**
     * Get the authorization server URL for credential offers.
     * Uses Chained AS if configured, otherwise falls back to the default AS.
     */
    private async getAuthorizationServer(tenantId: string): Promise<string> {
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        if (issuanceConfig.chainedAs?.enabled) {
            const publicUrl =
                this.configService.getOrThrow<string>("PUBLIC_URL");
            return `${publicUrl}/${tenantId}/chained-as`;
        }

        return this.authzService.getAuthzIssuer(tenantId);
    }

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

        // Add Chained AS if enabled
        if (issuanceConfig.chainedAs?.enabled) {
            const chainedAsIssuer = `${credential_issuer}/chained-as`;
            authServers.push(chainedAsIssuer);
            authorizationServers.push(
                await firstValueFrom(
                    this.httpService.get(
                        `${chainedAsIssuer}/.well-known/oauth-authorization-server`,
                    ),
                ).then(
                    (response) => response.data,
                    () => {
                        throw new BadRequestException(
                            "Failed to fetch Chained AS metadata",
                        );
                    },
                ),
            );
        }

        authServers.push(this.authzService.getAuthzIssuer(tenantId));
        authorizationServers.push(
            await this.authzService.authzMetadata(tenantId),
        );

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
                              description: body.tx_code_description,
                          }
                        : undefined,
                    // Pre-authorized code flow always uses the built-in AS
                    // since the pre-authorized code is generated by the issuer
                    authorization_server:
                        this.authzService.getAuthzIssuer(tenantId),
                } as CredentialOfferPreAuthorizedCodeGrant,
            };
        } else {
            // For authorization code flow, use Chained AS if configured
            const authServer =
                body.authorization_server ??
                (await this.getAuthorizationServer(tenantId));
            grants = {
                [authorizationCodeGrantIdentifier]: {
                    issuer_state,
                    authorization_server: authServer,
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
     * Verify the resource access token from the request.
     * Supports both DPoP and Bearer authentication schemes based on configuration.
     */
    private async verifyResourceAccessToken(
        req: Request,
        tenantId: string,
        issuerMetadata: IssuerMetadataResult,
        issuanceConfig: Awaited<
            ReturnType<IssuanceService["getIssuanceConfiguration"]>
        >,
    ): Promise<OAuth2TokenPayload> {
        const resourceServer = this.getResourceServer(tenantId);
        const headers = getHeadersFromRequest(req);

        const allowedAuthenticationSchemes = [
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

        return tokenPayload as OAuth2TokenPayload;
    }

    /**
     * Resolve the session and claims based on the token source.
     * Handles Local AS, Chained AS, and External AS flows.
     */
    private async resolveSessionAndClaims(
        tokenPayload: OAuth2TokenPayload,
        tenantId: string,
        credentialConfigurationId: string,
        issuanceConfig: Awaited<
            ReturnType<IssuanceService["getIssuanceConfiguration"]>
        >,
    ): Promise<{
        session: Session;
        claimsResult: ClaimsWebhookResult | undefined;
        isExternalAsToken: boolean;
        isChainedAsToken: boolean;
    }> {
        const localIssuer = this.authzService.getAuthzIssuer(tenantId);
        const publicUrl = this.configService.getOrThrow<string>("PUBLIC_URL");
        const chainedAsIssuer = `${publicUrl}/${tenantId}/chained-as`;

        const isLocalAsToken = tokenPayload.iss === localIssuer;
        const isChainedAsToken = tokenPayload.iss === chainedAsIssuer;
        const isExternalAsToken = !isLocalAsToken && !isChainedAsToken;

        let session: Session;
        let claimsResult: ClaimsWebhookResult | undefined;

        if (isChainedAsToken) {
            // Chained AS flow - EUDIPLO-issued token with issuer_state for session correlation
            const issuerState = tokenPayload.issuer_state as string | undefined;
            if (!issuerState) {
                throw new CredentialRequestException(
                    "credential_request_denied",
                    "Chained AS token is missing issuer_state claim",
                );
            }

            session = await this.sessionService.getBy({ id: issuerState });

            const upstreamIdentity =
                await this.chainedAsService.getUpstreamIdentityByIssuerState(
                    issuerState,
                );

            const identity: AuthorizationIdentity = upstreamIdentity ?? {
                iss: tokenPayload.iss,
                sub: (tokenPayload.upstream_sub as string) ?? tokenPayload.sub,
                token_claims: tokenPayload as unknown as Record<
                    string,
                    unknown
                >,
            };

            claimsResult = await this.credentialsService.getClaimsFromWebhook(
                credentialConfigurationId,
                session,
                { identity },
            );
        } else if (isExternalAsToken) {
            // External AS flow (e.g., Keycloak)
            const configuredAuthServers =
                issuanceConfig.authServers?.map((url) => url) ?? [];
            if (!configuredAuthServers.includes(tokenPayload.iss)) {
                throw new CredentialRequestException(
                    "credential_request_denied",
                    `Token issuer '${tokenPayload.iss}' is not a configured authorization server`,
                );
            }

            session = await this.sessionService.findOrCreateByExternalIdentity(
                tenantId,
                tokenPayload.iss,
                tokenPayload.sub,
            );

            const identity: AuthorizationIdentity = {
                iss: tokenPayload.iss,
                sub: tokenPayload.sub,
                token_claims: tokenPayload as unknown as Record<
                    string,
                    unknown
                >,
            };

            claimsResult = await this.credentialsService.getClaimsFromWebhook(
                credentialConfigurationId,
                session,
                { identity, requireWebhook: true },
            );
        } else {
            // Local AS flow - existing behavior
            session = await this.sessionService.getBy({
                id: tokenPayload.sub,
            });

            if (tokenPayload.sub !== session.id) {
                throw new CredentialRequestException(
                    "credential_request_denied",
                    "The access token is not associated with a valid session",
                );
            }

            const identity: AuthorizationIdentity = {
                iss: tokenPayload.iss,
                sub: tokenPayload.sub,
                token_claims: tokenPayload as unknown as Record<
                    string,
                    unknown
                >,
            };

            claimsResult = await this.credentialsService.getClaimsFromWebhook(
                credentialConfigurationId,
                session,
                { identity },
            );
        }

        return { session, claimsResult, isExternalAsToken, isChainedAsToken };
    }

    /**
     * Extract and validate nonces from JWT proofs.
     * Ensures all proofs contain valid, non-expired nonces and consumes them.
     */
    private async validateAndConsumeNonces(
        proofs: string[],
        tenantId: string,
        logContext: SessionLogContext,
        credentialConfigurationId: string,
    ): Promise<void> {
        // OID4VCI spec Section 8.3.1.2: When the Credential Issuer has a Nonce Endpoint,
        // all key proofs MUST contain a c_nonce value.
        const uniqueNonces = new Set<string>();
        for (const jwt of proofs) {
            const payload = decodeJwt(jwt);
            if (!payload.nonce) {
                throw new CredentialRequestException(
                    "invalid_proof",
                    "All key proofs must contain a nonce when the nonce endpoint is offered",
                );
            }
            uniqueNonces.add(payload.nonce as string);
        }

        // Validate and consume all unique nonces upfront
        for (const nonce of uniqueNonces) {
            const nonceEntity = await this.nonceRepository.findOne({
                where: { nonce, tenantId },
            });

            if (!nonceEntity) {
                const nonceError = new CredentialRequestException(
                    "invalid_nonce",
                    "The nonce in the key proof is invalid or has already been used",
                );
                this.sessionLogger.logFlowError(logContext, nonceError, {
                    credentialConfigurationId,
                });
                throw nonceError;
            }

            if (nonceEntity.expiresAt < new Date()) {
                await this.nonceRepository.delete({ nonce, tenantId });
                const nonceError = new CredentialRequestException(
                    "invalid_nonce",
                    "The nonce in the key proof has expired",
                );
                this.sessionLogger.logFlowError(logContext, nonceError, {
                    credentialConfigurationId,
                });
                throw nonceError;
            }

            // Consume the nonce (delete it so it can't be reused)
            await this.nonceRepository.delete({ nonce, tenantId });
        }
    }

    /**
     * Verify proofs and issue credentials for each JWT proof.
     */
    private async issueCredentialsForProofs(
        proofs: string[],
        issuer: Openid4vciIssuer,
        session: Session,
        credentialConfigurationId: string,
        claimsResult: ClaimsWebhookResult | undefined,
        logContext: SessionLogContext,
    ): Promise<{ credential: string }[]> {
        const credentials: { credential: string }[] = [];

        for (const jwt of proofs) {
            const payload = decodeJwt(jwt);
            const expectedNonce = payload.nonce! as string;

            const verifiedProof = await issuer.verifyCredentialRequestJwtProof({
                expectedNonce,
                issuerMetadata: await this.issuerMetadata(session.tenantId),
                jwt,
            });

            const cnf = verifiedProof.signer.publicJwk;
            const cred = await this.credentialsService.getCredential(
                credentialConfigurationId,
                cnf,
                session,
                claimsResult?.claims,
            );

            credentials.push({ credential: cred });

            this.sessionLogger.logCredentialIssuance(
                logContext,
                credentialConfigurationId,
                {
                    credentialSize: cred.length,
                    proofVerified: true,
                },
            );
        }

        return credentials;
    }

    /**
     * Map generic errors to OID4VCI-compliant credential request exceptions.
     */
    private mapToCredentialRequestException(error: unknown): never {
        if (error instanceof CredentialRequestException) {
            throw error;
        }

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

        throw new CredentialRequestException(
            "credential_request_denied",
            error instanceof Error
                ? error.message
                : "An unexpected error occurred",
        );
    }

    /**
     * Get a credential for a specific session.
     * @param req The incoming HTTP request
     * @param tenantId The tenant identifier
     * @returns The credential response or deferred response
     */
    async getCredential(
        req: Request,
        tenantId: string,
    ): Promise<CreateCredentialResponseReturn | DeferredCredentialResponse> {
        const issuer = this.getIssuer(tenantId);
        const issuerMetadata = await this.issuerMetadata(tenantId, issuer);
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        // Parse and validate the credential request
        const known = issuer.getKnownCredentialConfigurationsSupported(
            issuerMetadata.credentialIssuer,
        );
        issuerMetadata.knownCredentialConfigurations = known;

        let parsedCredentialRequest: ParseCredentialRequestReturn;
        try {
            parsedCredentialRequest = issuer.parseCredentialRequest({
                issuerMetadata,
                credentialRequest: req.body as Record<string, unknown>,
            });
        } catch (err) {
            throw new CredentialRequestException(
                "invalid_credential_request",
                err instanceof Error
                    ? err.message
                    : "The Credential Request is malformed or missing required parameters",
            );
        }

        if (parsedCredentialRequest?.proofs?.jwt === undefined) {
            throw new CredentialRequestException(
                "invalid_proof",
                "The proofs parameter is missing or does not contain required JWT proofs",
            );
        }

        // Verify access token
        const tokenPayload = await this.verifyResourceAccessToken(
            req,
            tenantId,
            issuerMetadata,
            issuanceConfig,
        );

        // Resolve session and claims based on token source
        const credentialConfigurationId =
            parsedCredentialRequest.credentialConfigurationId as string;
        const { session, claimsResult, isExternalAsToken, isChainedAsToken } =
            await this.resolveSessionAndClaims(
                tokenPayload,
                tenantId,
                credentialConfigurationId,
                issuanceConfig,
            );

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId,
            flowType: "OID4VCI",
            stage: "credential_request",
        };

        this.sessionLogger.logFlowStart(logContext, {
            credentialConfigurationId,
            proofCount: parsedCredentialRequest.proofs.jwt.length,
            isExternalAs: isExternalAsToken,
            isChainedAs: isChainedAsToken,
        });

        try {
            // Check if the webhook indicated deferred issuance
            if (claimsResult?.deferred) {
                return this.deferredCredentialService.createDeferredTransaction(
                    {
                        parsedCredentialRequest: {
                            proofs: {
                                jwt: parsedCredentialRequest.proofs.jwt!,
                            },
                            credentialConfigurationId,
                        },
                        session,
                        tenantId,
                        interval: claimsResult.interval,
                        issuerMetadata,
                    },
                    logContext,
                );
            }

            // Validate and consume nonces
            await this.validateAndConsumeNonces(
                parsedCredentialRequest.proofs.jwt,
                tenantId,
                logContext,
                credentialConfigurationId,
            );

            // Issue credentials for each proof
            const credentials = await this.issueCredentialsForProofs(
                parsedCredentialRequest.proofs.jwt,
                issuer,
                session,
                credentialConfigurationId,
                claimsResult,
                logContext,
            );

            // Update session with notification
            const notificationId = v4();
            session.notifications.push({
                id: notificationId,
                credentialConfigurationId,
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
                notificationId,
            });
        } catch (error) {
            this.sessionLogger.logFlowError(logContext, error as Error, {
                credentialConfigurationId,
            });
            this.mapToCredentialRequestException(error);
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
        const issuerMetadata = await this.issuerMetadata(tenantId, issuer);
        return this.deferredCredentialService.getDeferredCredential(
            req,
            body,
            tenantId,
            issuerMetadata,
        );
    }

    /**
     * Mark a deferred transaction as ready with the issued credential.
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
        return this.deferredCredentialService.completeDeferredTransaction(
            tenantId,
            transactionId,
            claims,
        );
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
        return this.deferredCredentialService.failDeferredTransaction(
            tenantId,
            transactionId,
            errorMessage,
        );
    }
}
