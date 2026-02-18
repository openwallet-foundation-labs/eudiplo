import {
    createHash,
    randomBytes,
    randomUUID,
    X509Certificate,
} from "node:crypto";
import { HttpService } from "@nestjs/axios";
import {
    BadRequestException,
    Inject,
    Injectable,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Openid4vciIssuer } from "@openid4vc/openid4vci";
import * as x509 from "@peculiar/x509";
import { decodeJwt, decodeProtectedHeader, JWK } from "jose";
import { firstValueFrom } from "rxjs";
import { LessThan, Repository } from "typeorm";
import { v4 } from "uuid";
import { CryptoService } from "../../../../crypto/crypto.service";
import { CryptoImplementationService } from "../../../../crypto/key/crypto-implementation/crypto-implementation.service";
import { KeyService } from "../../../../crypto/key/key.service";
import { SessionService } from "../../../../session/session.service";
import { StatusListVerifierService } from "../../../../shared/trust/status-list-verifier.service";
import {
    BuiltTrustStore,
    TrustStoreService,
} from "../../../../shared/trust/trust-store.service";
import {
    ServiceTypeIdentifiers,
    TrustListSource,
} from "../../../../shared/trust/types";
import {
    MatchedTrustedEntity,
    X509ValidationService,
} from "../../../../shared/trust/x509-validation.service";
import { AuthorizationIdentity } from "../../../configuration/credentials/credentials.service";
import type { ChainedAsConfig } from "../../../configuration/issuance/dto/chained-as-config.dto";
import { IssuanceService } from "../../../configuration/issuance/issuance.service";
import {
    ChainedAsParRequestDto,
    ChainedAsParResponseDto,
    ChainedAsTokenRequestDto,
    ChainedAsTokenResponseDto,
} from "./dto/chained-as.dto";
import {
    ChainedAsSessionEntity,
    ChainedAsSessionStatus,
} from "./entities/chained-as-session.entity";

/**
 * Extract DPoP JWK thumbprint from DPoP JWT.
 * Returns undefined if parsing fails or DPoP is not provided.
 */
export function extractDpopJkt(dpopJwt?: string): string | undefined {
    if (!dpopJwt) {
        return undefined;
    }
    try {
        const header = decodeProtectedHeader(dpopJwt);
        if (header.jwk) {
            // Calculate JWK thumbprint (simplified - in production use jose's calculateJwkThumbprint)
            const thumbprintInput = JSON.stringify({
                crv: header.jwk.crv,
                kty: header.jwk.kty,
                x: header.jwk.x,
                y: header.jwk.y,
            });
            return createHash("sha256")
                .update(thumbprintInput)
                .digest("base64url");
        }
    } catch {
        // Invalid DPoP JWT
    }
    return undefined;
}

/**
 * Upstream OIDC discovery document structure.
 */
interface OidcDiscoveryDocument {
    issuer: string;
    authorization_endpoint: string;
    token_endpoint: string;
    userinfo_endpoint?: string;
    jwks_uri: string;
    scopes_supported?: string[];
    response_types_supported?: string[];
    token_endpoint_auth_methods_supported?: string[];
}

/**
 * Service implementing Chained Authorization Server functionality.
 *
 * In Chained AS mode, EUDIPLO acts as an OAuth Authorization Server facade:
 * - Receives OAuth requests from wallets
 * - Delegates user authentication to an upstream OIDC provider
 * - Issues its own access tokens containing issuer_state
 *
 * This enables session correlation without requiring modifications to
 * the upstream OIDC provider (e.g., Keycloak).
 */
@Injectable()
export class ChainedAsService {
    private readonly logger = new Logger(ChainedAsService.name);

    /** Cache for upstream OIDC discovery documents */
    private readonly discoveryCache = new Map<
        string,
        { doc: OidcDiscoveryDocument; expiresAt: number }
    >();

    /** Request URI prefix for PAR responses */
    private readonly REQUEST_URI_PREFIX = "urn:ietf:params:oauth:request_uri:";

    /** Default session lifetime in seconds */
    private readonly SESSION_LIFETIME_SECONDS = 600;

    /** Default authorization code lifetime in seconds */
    private readonly AUTH_CODE_LIFETIME_SECONDS = 300;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        @Inject("KeyService") private readonly keyService: KeyService,
        private readonly cryptoService: CryptoService,
        private readonly cryptoImplementationService: CryptoImplementationService,
        private readonly sessionService: SessionService,
        private readonly issuanceService: IssuanceService,
        private readonly trustStoreService: TrustStoreService,
        private readonly x509ValidationService: X509ValidationService,
        private readonly statusListVerifierService: StatusListVerifierService,
        @InjectRepository(ChainedAsSessionEntity)
        private readonly sessionRepository: Repository<ChainedAsSessionEntity>,
    ) {}

    /**
     * Get the base URL for this tenant's Chained AS.
     */
    private getChainedAsBaseUrl(tenantId: string): string {
        const publicUrl = this.configService.getOrThrow<string>("PUBLIC_URL");
        return `${publicUrl}/${tenantId}/chained-as`;
    }

    /**
     * Get the Chained AS configuration for a tenant.
     * @throws NotFoundException if chained AS is not configured or not enabled
     */
    async getChainedAsConfig(tenantId: string): Promise<ChainedAsConfig> {
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        if (!issuanceConfig.chainedAs?.enabled) {
            throw new NotFoundException(
                "Chained Authorization Server is not enabled for this tenant",
            );
        }

        return issuanceConfig.chainedAs;
    }

    /**
     * Get the OID4VCI issuer instance for a specific tenant.
     * Used for wallet attestation verification.
     */
    private getIssuer(tenantId: string): Openid4vciIssuer {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
        return new Openid4vciIssuer({ callbacks });
    }

    /**
     * Verify wallet attestation if provided or required.
     * Validates the attestation JWT signature, checks the X.509 certificate chain
     * against configured trust lists, and verifies the status list if present.
     * @param tenantId The tenant ID
     * @param clientAttestation The client attestation from the PAR request
     * @param authorizationServer The authorization server URL
     * @param walletAttestationRequired Whether wallet attestation is required
     * @param walletProviderTrustLists URLs of trust lists containing trusted wallet providers
     */
    private async verifyWalletAttestation(
        tenantId: string,
        clientAttestation:
            | {
                  clientAttestationJwt: string;
                  clientAttestationPopJwt: string;
              }
            | undefined,
        authorizationServer: string,
        walletAttestationRequired: boolean,
        walletProviderTrustLists: string[],
    ): Promise<void> {
        if (!clientAttestation) {
            if (walletAttestationRequired) {
                throw new UnauthorizedException(
                    "Wallet attestation is required but not provided",
                );
            }
            return;
        }

        try {
            // First verify the attestation JWT structure and PoP
            await this.getIssuer(tenantId).verifyWalletAttestation({
                authorizationServer,
                clientAttestationJwt: clientAttestation.clientAttestationJwt,
                clientAttestationPopJwt:
                    clientAttestation.clientAttestationPopJwt,
            });

            // Then validate the X.509 certificate against trust lists and get the matched entity
            const { matchedEntity, trustStore } =
                await this.validateWalletProviderCertificate(
                    clientAttestation.clientAttestationJwt,
                    walletProviderTrustLists,
                );

            // Check the status list if present in the attestation JWT
            await this.validateWalletAttestationStatus(
                clientAttestation.clientAttestationJwt,
                matchedEntity,
                trustStore,
            );

            this.logger.debug("Wallet attestation verified successfully");
        } catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }
            throw new UnauthorizedException(
                `Wallet attestation verification failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
        }
    }

    /**
     * Validate the wallet provider's X.509 certificate against configured trust lists.
     * Returns the matched entity and trust store for use in status list verification.
     */
    private async validateWalletProviderCertificate(
        clientAttestationJwt: string,
        trustListUrls: string[],
    ): Promise<{
        matchedEntity: MatchedTrustedEntity | null;
        trustStore: BuiltTrustStore | null;
    }> {
        if (trustListUrls.length === 0) {
            this.logger.warn(
                "No wallet provider trust lists configured - accepting attestation without certificate validation",
            );
            return { matchedEntity: null, trustStore: null };
        }

        // Extract X.509 certificate chain from JWT header
        const header = decodeProtectedHeader(clientAttestationJwt);
        const x5c = header.x5c;

        if (!x5c || x5c.length === 0) {
            throw new UnauthorizedException(
                "Wallet attestation JWT does not contain X.509 certificate chain (x5c header)",
            );
        }

        // Build trust list source from configured URLs
        const trustListSource: TrustListSource = {
            lotes: trustListUrls.map((url) => ({ url })),
            acceptedServiceTypes: [ServiceTypeIdentifiers.WalletProvider],
        };

        // Fetch and build the trust store
        const trustStore =
            await this.trustStoreService.getTrustStore(trustListSource);

        if (trustStore.entities.length === 0) {
            throw new UnauthorizedException(
                "No trusted wallet providers found in configured trust lists",
            );
        }

        // Parse the certificate chain
        const certChain = this.x509ValidationService.parseX5c(x5c);
        const leaf = certChain[0];

        // Build and validate the certificate path against trust anchors
        const trustAnchors = this.x509ValidationService.parseTrustAnchors(
            trustStore.entities.flatMap((e) => e.services),
        );

        try {
            const path = await this.x509ValidationService.buildPath(
                leaf,
                certChain,
                trustAnchors,
            );

            // Check if the path matches any trusted entity
            const match =
                await this.x509ValidationService.pathMatchesTrustedEntities(
                    path,
                    trustStore.entities,
                    "leaf",
                    ServiceTypeIdentifiers.WalletProvider,
                );

            if (!match) {
                throw new UnauthorizedException(
                    "Wallet provider certificate is not trusted - no matching entity in trust list",
                );
            }

            this.logger.debug(
                `Wallet attestation validated against trusted entity: ${match.entity.entityId ?? "unknown"}`,
            );

            return { matchedEntity: match, trustStore };
        } catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }
            throw new UnauthorizedException(
                `Certificate chain validation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
        }
    }

    /**
     * Validate the status of a wallet attestation JWT if it contains a status claim.
     */
    private async validateWalletAttestationStatus(
        clientAttestationJwt: string,
        matchedEntity: MatchedTrustedEntity | null,
        trustStore: BuiltTrustStore | null,
    ): Promise<void> {
        try {
            // Get the status entry from the JWT
            const statusEntry =
                this.statusListVerifierService.getStatusEntryFromJwt(
                    clientAttestationJwt,
                );

            // No status claim in JWT - this is allowed per spec
            if (!statusEntry) {
                this.logger.debug(
                    "Wallet attestation does not contain status claim - skipping status check",
                );
                return;
            }

            // Fetch the status list JWT
            const statusListJwt =
                await this.statusListVerifierService.getStatusListJwt(
                    statusEntry.uri,
                );

            // Verify the status list JWT signature against the revocation cert
            const signatureValid = await this.verifyStatusListSignature(
                statusListJwt,
                matchedEntity,
                trustStore,
            );

            if (!signatureValid) {
                throw new UnauthorizedException(
                    "Status list JWT signature verification failed - not signed by trusted revocation certificate",
                );
            }

            // Check the actual status value
            const statusResult =
                await this.statusListVerifierService.checkStatus(
                    statusEntry.uri,
                    statusEntry.idx,
                );

            if (!statusResult.isValid) {
                this.logger.warn(
                    `Wallet attestation status check failed: ${statusResult.description}`,
                );
                throw new UnauthorizedException(
                    `Wallet attestation is not valid: ${statusResult.description}`,
                );
            }

            this.logger.debug(
                `Wallet attestation status verified: ${statusResult.description}`,
            );
        } catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }
            // Log the error but don't fail - status checking is optional
            this.logger.warn(
                `Failed to check wallet attestation status: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
        }
    }

    /**
     * Verify the signature of a status list JWT against the revocation certificate.
     */
    private async verifyStatusListSignature(
        statusListJwt: string,
        matchedEntity: MatchedTrustedEntity | null,
        trustStore: BuiltTrustStore | null,
    ): Promise<boolean> {
        try {
            const header = decodeProtectedHeader(statusListJwt);
            const x5c = header.x5c;

            if (!x5c || x5c.length === 0) {
                if (!matchedEntity) {
                    return true;
                }
                this.logger.warn(
                    "Status list JWT missing x5c header - cannot verify against trust chain",
                );
                return false;
            }

            // Verify the JWT signature
            const cert = new X509Certificate(Buffer.from(x5c[0], "base64"));
            const publicKey = cert.publicKey.export({ format: "jwk" }) as JWK;
            const crypto =
                this.cryptoImplementationService.getCryptoFromJwk(publicKey);
            const verifier = await crypto.getVerifier(publicKey);

            const [headerB64, payloadB64, signatureB64] =
                statusListJwt.split(".");
            const data = `${headerB64}.${payloadB64}`;

            const sigOk = await verifier(data, signatureB64)
                .then(() => true)
                .catch((e) => {
                    this.logger.debug(
                        `Status list JWT signature invalid: ${e?.message ?? e}`,
                    );
                    return false;
                });

            if (!sigOk) return false;

            if (!matchedEntity || !trustStore) {
                return true;
            }

            // Check if the matched entity has a revocation certificate
            if (!matchedEntity.revocationCert) {
                this.logger.warn(
                    `TrustedEntity ${matchedEntity.entity.entityId ?? "unknown"} ` +
                        `has no revocation certificate configured - accepting status list`,
                );
                return true;
            }

            // Build and verify the status list's certificate chain
            const presented = this.x509ValidationService.parseX5c(x5c);
            const leaf = presented[0];

            const allCerts = trustStore.entities.flatMap((e) =>
                e.services.map((s) => ({ certValue: s.certValue })),
            );
            const anchors =
                this.x509ValidationService.parseTrustAnchors(allCerts);

            let path: x509.X509Certificate[];
            try {
                path = await this.x509ValidationService.buildPath(
                    leaf,
                    presented,
                    anchors,
                );
            } catch (e: any) {
                this.logger.debug(
                    `Status list chain build failed: ${e?.message ?? e}`,
                );
                return false;
            }

            // Get thumbprints for comparison
            const statusLeafThumb = await this.getThumbprint(presented[0]);
            const statusEndThumb = await this.getThumbprint(path.at(-1)!);

            const revocationThumb = matchedEntity.revocationThumbprint!;
            const revocationIsCa = this.x509ValidationService.isCaCert(
                matchedEntity.revocationCert,
            );

            let statusMatchesRevocation = false;
            if (revocationIsCa) {
                statusMatchesRevocation = revocationThumb === statusEndThumb;
            } else {
                statusMatchesRevocation = revocationThumb === statusLeafThumb;
            }

            if (!statusMatchesRevocation) {
                this.logger.warn(
                    `Status list is NOT signed by the revocation certificate from the same TrustedEntity`,
                );
                return false;
            }

            return true;
        } catch (e: any) {
            this.logger.error(
                `Error verifying status list signature: ${e?.message ?? e}`,
            );
            return false;
        }
    }

    /**
     * Calculate the SHA-256 thumbprint of an X.509 certificate.
     */
    private async getThumbprint(cert: x509.X509Certificate): Promise<string> {
        const thumbBuffer = await cert.getThumbprint("SHA-256");
        return Buffer.from(thumbBuffer).toString("hex").toLowerCase();
    }

    /**
     * Fetch the OIDC discovery document from an upstream provider.
     * Results are cached for 5 minutes.
     */
    async getUpstreamDiscovery(issuer: string): Promise<OidcDiscoveryDocument> {
        const cached = this.discoveryCache.get(issuer);
        if (cached && cached.expiresAt > Date.now()) {
            return cached.doc;
        }

        const wellKnownUrl = `${issuer.replace(/\/$/, "")}/.well-known/openid-configuration`;

        try {
            const response = await firstValueFrom(
                this.httpService.get<OidcDiscoveryDocument>(wellKnownUrl),
            );

            const doc = response.data;
            // Cache for 5 minutes
            this.discoveryCache.set(issuer, {
                doc,
                expiresAt: Date.now() + 5 * 60 * 1000,
            });

            return doc;
        } catch (error) {
            this.logger.error(
                `Failed to fetch OIDC discovery from ${wellKnownUrl}`,
                error,
            );
            throw new BadRequestException(
                "Failed to fetch upstream OIDC configuration",
            );
        }
    }

    /**
     * Handle a Pushed Authorization Request (PAR).
     * Creates a session and returns a request_uri for the authorize endpoint.
     */
    async handlePar(
        tenantId: string,
        request: ChainedAsParRequestDto,
        dpopJkt?: string,
        clientAttestation?: {
            clientAttestationJwt: string;
            clientAttestationPopJwt: string;
        },
    ): Promise<ChainedAsParResponseDto> {
        // Validate configuration
        const config = await this.getChainedAsConfig(tenantId);
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        // Validate response_type
        if (request.response_type !== "code") {
            throw new BadRequestException(
                'Invalid response_type, must be "code"',
            );
        }

        // Validate PKCE if required
        if (config.requireDPoP && !dpopJkt) {
            throw new BadRequestException("DPoP is required");
        }

        // Verify wallet attestation if provided or required
        const chainedAsUrl = this.getChainedAsBaseUrl(tenantId);
        await this.verifyWalletAttestation(
            tenantId,
            clientAttestation,
            chainedAsUrl,
            issuanceConfig.walletAttestationRequired ?? false,
            issuanceConfig.walletProviderTrustLists ?? [],
        );

        // Find the session for the issuer_state (if provided)
        let issuerState = request.issuer_state;
        if (issuerState) {
            // Verify the issuer_state exists in our session store
            try {
                await this.sessionService.get(issuerState);
            } catch {
                throw new BadRequestException("Invalid issuer_state");
            }
        } else {
            // Generate a new issuer_state if not provided
            issuerState = v4();
        }

        // Create the session
        const sessionId = v4();
        const expiresAt = new Date(
            Date.now() + this.SESSION_LIFETIME_SECONDS * 1000,
        );

        const session = this.sessionRepository.create({
            id: sessionId,
            tenantId,
            status: ChainedAsSessionStatus.PENDING_AUTHORIZE,
            issuerState,
            clientId: request.client_id,
            redirectUri: request.redirect_uri,
            codeChallenge: request.code_challenge,
            codeChallengeMethod: request.code_challenge_method,
            walletState: request.state,
            scope: request.scope,
            authorizationDetails: request.authorization_details,
            dpopJkt,
            expiresAt,
        });

        await this.sessionRepository.save(session);

        this.logger.debug(
            `Created Chained AS PAR session ${sessionId} for tenant ${tenantId}`,
        );

        return {
            request_uri: `${this.REQUEST_URI_PREFIX}${sessionId}`,
            expires_in: this.SESSION_LIFETIME_SECONDS,
        };
    }

    /**
     * Handle the authorize endpoint.
     * Validates the request_uri and redirects to the upstream OIDC provider.
     */
    async handleAuthorize(
        tenantId: string,
        clientId: string,
        requestUri: string,
    ): Promise<string> {
        // Validate configuration
        const config = await this.getChainedAsConfig(tenantId);

        if (!config.upstream) {
            throw new BadRequestException(
                "Upstream OIDC provider not configured",
            );
        }

        // Extract session ID from request_uri
        if (!requestUri.startsWith(this.REQUEST_URI_PREFIX)) {
            throw new BadRequestException("Invalid request_uri format");
        }
        const sessionId = requestUri.slice(this.REQUEST_URI_PREFIX.length);

        // Find the session
        const session = await this.sessionRepository.findOne({
            where: {
                id: sessionId,
                tenantId,
                status: ChainedAsSessionStatus.PENDING_AUTHORIZE,
            },
        });

        if (!session) {
            throw new BadRequestException("Invalid or expired request_uri");
        }

        // Verify client_id matches
        if (session.clientId !== clientId) {
            throw new BadRequestException("Client ID mismatch");
        }

        // Check expiration
        if (session.expiresAt < new Date()) {
            session.status = ChainedAsSessionStatus.EXPIRED;
            await this.sessionRepository.save(session);
            throw new BadRequestException("Session expired");
        }

        // Fetch upstream discovery
        const discovery = await this.getUpstreamDiscovery(
            config.upstream.issuer,
        );

        // Generate state, nonce, and PKCE for upstream request
        const upstreamState = randomUUID();
        const upstreamNonce = randomUUID();
        const upstreamCodeVerifier = randomBytes(32).toString("base64url");
        const upstreamCodeChallenge = createHash("sha256")
            .update(upstreamCodeVerifier)
            .digest("base64url");

        // Update session with upstream parameters
        session.status = ChainedAsSessionStatus.PENDING_UPSTREAM_CALLBACK;
        session.upstreamState = upstreamState;
        session.upstreamNonce = upstreamNonce;
        session.upstreamCodeVerifier = upstreamCodeVerifier;
        await this.sessionRepository.save(session);

        // Build upstream authorization URL
        const callbackUrl = `${this.getChainedAsBaseUrl(tenantId)}/callback`;
        const upstreamScopes = config.upstream.scopes || ["openid"];

        const authUrl = new URL(discovery.authorization_endpoint);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", config.upstream.clientId);
        authUrl.searchParams.set("redirect_uri", callbackUrl);
        authUrl.searchParams.set("scope", upstreamScopes.join(" "));
        authUrl.searchParams.set("state", upstreamState);
        authUrl.searchParams.set("nonce", upstreamNonce);
        authUrl.searchParams.set("code_challenge", upstreamCodeChallenge);
        authUrl.searchParams.set("code_challenge_method", "S256");

        this.logger.debug(
            `Redirecting to upstream OIDC: ${authUrl.origin}${authUrl.pathname}`,
        );

        return authUrl.toString();
    }

    /**
     * Build error redirect URL for wallet.
     */
    private buildErrorRedirect(
        redirectUri: string,
        error: string,
        errorDescription?: string,
        walletState?: string,
    ): string {
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set("error", error);
        if (errorDescription) {
            redirectUrl.searchParams.set("error_description", errorDescription);
        }
        if (walletState) {
            redirectUrl.searchParams.set("state", walletState);
        }
        return redirectUrl.toString();
    }

    /**
     * Handle upstream OIDC error in callback.
     */
    private async handleUpstreamError(
        tenantId: string,
        state: string,
        error: string,
        errorDescription?: string,
    ): Promise<string> {
        this.logger.warn(`Upstream OIDC error: ${error} - ${errorDescription}`);
        const session = await this.sessionRepository.findOne({
            where: { tenantId, upstreamState: state },
        });
        if (session) {
            session.status = ChainedAsSessionStatus.EXPIRED;
            await this.sessionRepository.save(session);
            return this.buildErrorRedirect(
                session.redirectUri,
                error,
                errorDescription,
                session.walletState,
            );
        }
        throw new BadRequestException("Invalid callback state");
    }

    /**
     * Exchange authorization code with upstream OIDC provider.
     */
    private async exchangeUpstreamCode(
        session: ChainedAsSessionEntity,
        code: string,
        config: ChainedAsConfig,
        discovery: OidcDiscoveryDocument,
        callbackUrl: string,
    ): Promise<void> {
        const tokenResponse = await firstValueFrom(
            this.httpService.post(
                discovery.token_endpoint,
                new URLSearchParams({
                    grant_type: "authorization_code",
                    code,
                    redirect_uri: callbackUrl,
                    client_id: config.upstream!.clientId,
                    client_secret: config.upstream!.clientSecret || "",
                    code_verifier: session.upstreamCodeVerifier || "",
                }).toString(),
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                },
            ),
        );

        const tokens = tokenResponse.data as {
            access_token: string;
            id_token?: string;
        };

        if (tokens.id_token) {
            session.upstreamIdTokenClaims = decodeJwt(
                tokens.id_token,
            ) as Record<string, unknown>;
        }

        try {
            session.upstreamAccessTokenClaims = decodeJwt(
                tokens.access_token,
            ) as Record<string, unknown>;
        } catch {
            session.upstreamAccessTokenClaims = {};
        }
    }

    /**
     * Handle the callback from the upstream OIDC provider.
     * Exchanges the code for tokens and redirects back to the wallet.
     */
    async handleUpstreamCallback(
        tenantId: string,
        code: string,
        state: string,
        error?: string,
        errorDescription?: string,
    ): Promise<string> {
        if (error) {
            return this.handleUpstreamError(
                tenantId,
                state,
                error,
                errorDescription,
            );
        }

        const session = await this.sessionRepository.findOne({
            where: {
                tenantId,
                upstreamState: state,
                status: ChainedAsSessionStatus.PENDING_UPSTREAM_CALLBACK,
            },
        });

        if (!session) {
            throw new BadRequestException("Invalid or expired callback state");
        }

        const config = await this.getChainedAsConfig(tenantId);
        if (!config.upstream) {
            throw new BadRequestException(
                "Upstream OIDC provider not configured",
            );
        }
        const discovery = await this.getUpstreamDiscovery(
            config.upstream.issuer,
        );
        const callbackUrl = `${this.getChainedAsBaseUrl(tenantId)}/callback`;

        try {
            await this.exchangeUpstreamCode(
                session,
                code,
                config,
                discovery,
                callbackUrl,
            );
        } catch (err) {
            this.logger.error("Failed to exchange code at upstream", err);
            session.status = ChainedAsSessionStatus.EXPIRED;
            await this.sessionRepository.save(session);
            return this.buildErrorRedirect(
                session.redirectUri,
                "server_error",
                "Failed to exchange code with upstream provider",
                session.walletState,
            );
        }

        // Generate our authorization code for the wallet
        const authorizationCode = randomBytes(32).toString("base64url");
        session.status = ChainedAsSessionStatus.AUTHORIZED;
        session.authorizationCode = authorizationCode;
        session.authorizationCodeExpiresAt = new Date(
            Date.now() + this.AUTH_CODE_LIFETIME_SECONDS * 1000,
        );
        await this.sessionRepository.save(session);

        this.logger.debug(
            `Upstream auth completed for session ${session.id}, redirecting to wallet`,
        );

        const redirectUrl = new URL(session.redirectUri);
        redirectUrl.searchParams.set("code", authorizationCode);
        if (session.walletState) {
            redirectUrl.searchParams.set("state", session.walletState);
        }
        return redirectUrl.toString();
    }

    /**
     * Verify PKCE code verifier against stored code challenge.
     */
    private verifyPkce(
        session: ChainedAsSessionEntity,
        codeVerifier?: string,
    ): void {
        if (session.codeChallenge && codeVerifier) {
            const expectedChallenge =
                session.codeChallengeMethod === "S256"
                    ? createHash("sha256")
                          .update(codeVerifier)
                          .digest("base64url")
                    : codeVerifier;
            if (expectedChallenge !== session.codeChallenge) {
                throw new UnauthorizedException("Invalid code_verifier");
            }
        } else if (session.codeChallenge && !codeVerifier) {
            throw new BadRequestException("code_verifier is required");
        }
    }

    /**
     * Build access token payload.
     */
    private buildTokenPayload(
        tenantId: string,
        session: ChainedAsSessionEntity,
        tokenLifetime: number,
        jti: string,
        dpopJkt?: string,
    ): Record<string, unknown> {
        const now = Math.floor(Date.now() / 1000);
        const payload: Record<string, unknown> = {
            iss: this.getChainedAsBaseUrl(tenantId),
            sub: session.clientId,
            aud: `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${tenantId}`,
            iat: now,
            exp: now + tokenLifetime,
            jti,
            issuer_state: session.issuerState,
            client_id: session.clientId,
        };
        if (dpopJkt) {
            payload.cnf = { jkt: dpopJkt };
        }
        if (session.upstreamIdTokenClaims) {
            payload.upstream_sub = session.upstreamIdTokenClaims.sub;
            payload.upstream_iss = session.upstreamIdTokenClaims.iss;
        }
        return payload;
    }

    /**
     * Handle the token endpoint.
     * Exchanges the authorization code for an access token.
     */
    async handleToken(
        tenantId: string,
        request: ChainedAsTokenRequestDto,
        dpopJwt?: string,
    ): Promise<ChainedAsTokenResponseDto> {
        if (request.grant_type !== "authorization_code") {
            throw new BadRequestException(
                'Invalid grant_type, must be "authorization_code"',
            );
        }

        const session = await this.sessionRepository.findOne({
            where: {
                tenantId,
                authorizationCode: request.code,
                status: ChainedAsSessionStatus.AUTHORIZED,
            },
        });

        if (!session) {
            throw new UnauthorizedException("Invalid authorization code");
        }

        if (
            session.authorizationCodeExpiresAt &&
            session.authorizationCodeExpiresAt < new Date()
        ) {
            session.status = ChainedAsSessionStatus.EXPIRED;
            await this.sessionRepository.save(session);
            throw new UnauthorizedException("Authorization code expired");
        }

        this.verifyPkce(session, request.code_verifier);

        if (
            request.redirect_uri &&
            request.redirect_uri !== session.redirectUri
        ) {
            throw new BadRequestException("redirect_uri mismatch");
        }

        const config = await this.getChainedAsConfig(tenantId);
        let tokenType = "Bearer";
        let dpopJkt: string | undefined;

        if (dpopJwt) {
            // DPoP validation: extract JWK thumbprint from DPoP proof
            tokenType = "DPoP";
            dpopJkt = session.dpopJkt;
        } else if (config.requireDPoP) {
            throw new BadRequestException("DPoP proof is required");
        }

        const tokenLifetime = config.token?.lifetimeSeconds || 3600;
        const jti = v4();
        const tokenPayload = this.buildTokenPayload(
            tenantId,
            session,
            tokenLifetime,
            jti,
            dpopJkt,
        );

        // Get the key ID to use - either from config or resolve from key service
        const signingKeyId =
            config.token?.signingKeyId ||
            (await this.keyService.getKid(tenantId, "sign"));

        const publicKey = await this.keyService.getPublicKey(
            "jwk",
            tenantId,
            signingKeyId,
        );

        // Use the resolved signing key ID as the kid in the JWT header
        const kid = (publicKey as { kid?: string }).kid || signingKeyId;

        const accessToken = await this.keyService.signJWT(
            tokenPayload as any,
            { alg: "ES256", kid, typ: "at+jwt" },
            tenantId,
            signingKeyId,
        );

        session.status = ChainedAsSessionStatus.TOKEN_ISSUED;
        session.accessTokenJti = jti;
        await this.sessionRepository.save(session);

        return {
            access_token: accessToken,
            token_type: tokenType,
            expires_in: tokenLifetime,
            scope: session.scope,
            // Only include authorization_details if it's a non-empty array
            ...(Array.isArray(session.authorizationDetails) &&
                session.authorizationDetails.length > 0 && {
                    authorization_details: session.authorizationDetails,
                }),
        };
    }

    /**
     * Get the JWKS for token verification.
     */
    async getJwks(
        tenantId: string,
    ): Promise<{ keys: Record<string, unknown>[] }> {
        const config = await this.getChainedAsConfig(tenantId);

        // Get the key ID to use - either from config or resolve from key service
        const signingKeyId =
            config.token?.signingKeyId ||
            (await this.keyService.getKid(tenantId, "sign"));

        const publicKey = await this.keyService.getPublicKey(
            "jwk",
            tenantId,
            signingKeyId,
        );

        // Ensure the key has a kid set for proper JWT verification matching
        const keyWithKid = {
            ...publicKey,
            kid: (publicKey as { kid?: string }).kid || signingKeyId,
        };

        return {
            keys: [keyWithKid as Record<string, unknown>],
        };
    }

    /**
     * Get authorization server metadata for the Chained AS.
     */
    getMetadata(tenantId: string): Record<string, unknown> {
        const baseUrl = this.getChainedAsBaseUrl(tenantId);

        return {
            issuer: baseUrl,
            authorization_endpoint: `${baseUrl}/authorize`,
            token_endpoint: `${baseUrl}/token`,
            pushed_authorization_request_endpoint: `${baseUrl}/par`,
            jwks_uri: `${baseUrl}/.well-known/jwks.json`,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code"],
            token_endpoint_auth_methods_supported: ["none"],
            code_challenge_methods_supported: ["S256"],
            dpop_signing_alg_values_supported: ["ES256", "ES384", "ES512"],
        };
    }

    /**
     * Clean up expired sessions.
     */
    async cleanupExpiredSessions(): Promise<number> {
        const result = await this.sessionRepository.delete({
            expiresAt: LessThan(new Date()),
        });
        return result.affected || 0;
    }

    /**
     * Get upstream identity claims by issuer state.
     * Used to retrieve the upstream OIDC provider's claims for webhook calls.
     *
     * @param issuerState The issuer_state from the credential offer session
     * @returns Upstream identity with issuer, subject, and all token claims, or undefined if not found
     */
    async getUpstreamIdentityByIssuerState(
        issuerState: string,
    ): Promise<AuthorizationIdentity | undefined> {
        const chainedSession = await this.sessionRepository.findOne({
            where: { issuerState },
        });

        if (
            !chainedSession?.upstreamIdTokenClaims &&
            !chainedSession?.upstreamAccessTokenClaims
        ) {
            return undefined;
        }

        // Combine ID token and access token claims, preferring ID token for identity
        const idClaims = chainedSession.upstreamIdTokenClaims ?? {};
        const accessClaims = chainedSession.upstreamAccessTokenClaims ?? {};

        return {
            iss: (idClaims.iss as string) ?? (accessClaims.iss as string) ?? "",
            sub: (idClaims.sub as string) ?? (accessClaims.sub as string) ?? "",
            token_claims: {
                ...accessClaims,
                ...idClaims, // ID token claims take precedence
            },
        };
    }
}
