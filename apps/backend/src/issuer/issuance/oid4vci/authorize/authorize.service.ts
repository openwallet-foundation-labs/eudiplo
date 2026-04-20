import { randomUUID } from "node:crypto";
import { ConflictException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import {
    type AuthorizationCodeGrantIdentifier,
    type AuthorizationServerMetadata,
    authorizationCodeGrantIdentifier,
    type HttpMethod,
    Jwk,
    Oauth2AuthorizationServer,
    PkceCodeChallengeMethod,
    PreAuthorizedCodeGrantIdentifier,
    preAuthorizedCodeGrantIdentifier,
} from "@openid4vc/oauth2";
import type { Request } from "express";
import { Repository } from "typeorm";
import { v4 } from "uuid";
import { CryptoService } from "../../../../crypto/crypto.service";
import { KeyChainService } from "../../../../crypto/key/key-chain.service";
import { SessionService } from "../../../../session/session.service";
import { WalletAttestationService } from "../../../../shared/trust/wallet-attestation.service";
import { IssuanceService } from "../../../configuration/issuance/issuance.service";
import { StatusListConfigService } from "../../../lifecycle/status/status-list-config.service";
import { NonceEntity } from "../entities/nonces.entity";
import { TokenErrorException } from "../exceptions";
import { getHeadersFromRequest } from "../util";
import { AuthorizeQueries } from "./dto/authorize-request.dto";

export interface ParsedAccessTokenAuthorizationCodeRequestGrant {
    grantType: AuthorizationCodeGrantIdentifier;
    code: string;
}

interface ParsedAccessTokenPreAuthorizedCodeRequestGrant {
    grantType: PreAuthorizedCodeGrantIdentifier;
    preAuthorizedCode: string;
    txCode?: string;
}

@Injectable()
export class AuthorizeService {
    private readonly logger = new Logger(AuthorizeService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly cryptoService: CryptoService,
        private readonly sessionService: SessionService,
        private readonly issuanceService: IssuanceService,
        private readonly walletAttestationService: WalletAttestationService,
        private readonly keyChainService: KeyChainService,
        @InjectRepository(NonceEntity)
        private readonly nonceRepository: Repository<NonceEntity>,
        private readonly statusListConfigService: StatusListConfigService,
    ) {}

    getAuthorizationServer(
        tenantId: string,
        sessionId?: string,
    ): Oauth2AuthorizationServer {
        const callbacks = this.cryptoService.getCallbackContext(
            tenantId,
            sessionId,
        );
        return new Oauth2AuthorizationServer({
            callbacks,
        });
    }

    /**
     * Map error codes from the OAuth library to OAuth 2.0 Token Error codes.
     * According to OID4VCI Section 6.3:
     * - invalid_request: Transaction code provided but not expected, or expected but not provided
     * - invalid_grant: Wrong transaction code, wrong pre-authorized code, or expired code
     * - invalid_client: Anonymous access with pre-authorized code but not supported
     * @param errorCode The error code from the OAuth library
     * @returns The appropriate OAuth 2.0 token error code
     */
    private mapToTokenErrorCode(
        errorCode: string | undefined,
    ): "invalid_request" | "invalid_client" | "invalid_grant" {
        if (!errorCode) {
            return "invalid_request";
        }
        // The OAuth library may return these error codes directly
        if (
            errorCode === "invalid_grant" ||
            errorCode === "invalid_client" ||
            errorCode === "invalid_request"
        ) {
            return errorCode;
        }
        // Map specific error scenarios
        // Wrong or expired pre-authorized code = invalid_grant
        // Wrong tx_code = invalid_grant
        if (
            errorCode.includes("pre-authorized") ||
            errorCode.includes("pre_authorized") ||
            errorCode.includes("tx_code") ||
            errorCode.includes("transaction")
        ) {
            return "invalid_grant";
        }
        // Default to invalid_request for malformed requests
        return "invalid_request";
    }

    getAuthzIssuer(tenantId: string) {
        return `${this.configService.getOrThrow<string>("PUBLIC_URL")}/issuers/${tenantId}`;
    }

    async authzMetadata(
        tenantId: string,
    ): Promise<AuthorizationServerMetadata> {
        //TODO: read from config
        const useDpop = true;

        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);
        const walletAttestationRequired =
            issuanceConfig.walletAttestationRequired ?? false;

        const publicUrl = this.configService.getOrThrow<string>("PUBLIC_URL");
        const authServer = this.getAuthzIssuer(tenantId);

        // Check if status list aggregation is enabled for this tenant
        const statusListConfig =
            await this.statusListConfigService.getEffectiveConfig(tenantId);
        const statusListAggregationEndpoint = statusListConfig.enableAggregation
            ? `${authServer}/status-management/status-list-aggregation`
            : undefined;

        const metadata: AuthorizationServerMetadata = {
            issuer: authServer,
            token_endpoint: `${authServer}/authorize/token`,
            authorization_endpoint: `${authServer}/authorize`,
            interactive_authorization_endpoint: `${authServer}/authorize/interactive`,
            jwks_uri: `${publicUrl}/.well-known/jwks.json/issuers/${tenantId}`,
            grant_types_supported: [
                "authorization_code",
                "urn:ietf:params:oauth:grant-type:pre-authorized_code",
            ],
            dpop_signing_alg_values_supported: useDpop ? ["ES256"] : undefined,
            // TODO: verify this on the server
            require_pushed_authorization_requests: true,
            pushed_authorization_request_endpoint: `${authServer}/authorize/par`,
            code_challenge_methods_supported: [PkceCodeChallengeMethod.S256],
            authorization_details_types_supported: ["openid_credential"],
            token_endpoint_auth_methods_supported: ["none"],
            status_list_aggregation_endpoint: statusListAggregationEndpoint,
        };

        if (walletAttestationRequired) {
            metadata.token_endpoint_auth_methods_supported = [
                "attest_jwt_client_auth",
            ];
            metadata.challenge_endpoint = `${authServer}/authorize/challenge`;
            metadata.client_attestation_signing_alg_values_supported = [
                "ES256",
            ];
            metadata.client_attestation_pop_signing_alg_values_supported = [
                "ES256",
            ];
        }

        return this.getAuthorizationServer(
            tenantId,
        ).createAuthorizationServerMetadata(
            metadata as any,
        ) as AuthorizationServerMetadata;
    }

    /**
     * Client Attestation Challenge Endpoint.
     * Generates and stores a nonce for use in the Client Attestation PoP JWT.
     * @see OAuth2-ATCA07-8
     */
    async challengeRequest(
        tenantId: string,
    ): Promise<{ attestation_challenge: string }> {
        const nonce = v4();
        await this.nonceRepository.save({
            nonce,
            tenantId,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });
        return { attestation_challenge: nonce };
    }

    /**
     * Handle a Pushed Authorization Request (PAR).
     * Validates client attestation if provided/required, creates a session,
     * and returns a request_uri for the authorize endpoint.
     */
    async handlePar(
        tenantId: string,
        body: AuthorizeQueries,
        clientAttestation?: {
            clientAttestationJwt: string;
            clientAttestationPopJwt: string;
        },
    ): Promise<{ expires_in: number; request_uri: string }> {
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);
        const authorizationServerMetadata = await this.authzMetadata(tenantId);

        try {
            await this.walletAttestationService.verifyWalletAttestation(
                tenantId,
                clientAttestation,
                authorizationServerMetadata.issuer,
                issuanceConfig.walletAttestationRequired ?? false,
                issuanceConfig.walletProviderTrustLists ?? [],
            );
        } catch {
            throw new TokenErrorException(
                "invalid_client",
                "Client attestation validation failed",
            );
        }

        const request_uri = `urn:${randomUUID()}`;
        await this.sessionService.add(body.issuer_state!, {
            request_uri,
            auth_queries: body,
        });

        return { expires_in: 500, request_uri };
    }

    sendAuthorizationResponse(values: AuthorizeQueries, tenantId) {
        if (values.request_uri) {
            return this.sessionService
                .getBy({ request_uri: values.request_uri })
                .then(async (session) => {
                    const code = await this.setAuthCode(session.id);
                    const iss = this.getAuthzIssuer(tenantId);
                    return `${session.auth_queries!.redirect_uri}?code=${code}&state=${session.auth_queries!.state}&iss=${iss}`;
                })
                .catch(async () => {
                    //if not found, this means the flow is initiated by the wallet and not the issuer which is also fine.
                    const code = v4();
                    await this.sessionService.create({
                        id: v4(),
                        tenantId,
                        authorization_code: code,
                        request_uri: values.request_uri,
                    });
                    return `${values.redirect_uri}?code=${code}`;
                });
        } else {
            throw new ConflictException(
                "request_uri not found or not provided in the request",
            );
        }
    }

    /**
     * Validate the token request.
     * This endpoint is used to exchange the authorization code for an access token.
     * Returns errors according to OID4VCI Section 6.3 Token Error Response.
     * @param body
     * @param req
     * @returns
     */
    async validateTokenRequest(
        body: any,
        req: Request,
        tenantId: string,
    ): Promise<any> {
        const url = `${this.configService.getOrThrow<string>("PUBLIC_URL")}${req.url}`;

        // Parse the access token request - malformed requests return invalid_request
        let parsedAccessTokenRequest;
        try {
            parsedAccessTokenRequest = this.getAuthorizationServer(
                tenantId,
            ).parseAccessTokenRequest({
                accessTokenRequest: body,
                request: {
                    method: req.method as HttpMethod,
                    url,
                    headers: getHeadersFromRequest(req),
                },
            });
        } catch (err: any) {
            // Malformed token request
            throw new TokenErrorException(
                "invalid_request",
                err?.message ?? "The token request is malformed",
            );
        }

        const authorization_code =
            parsedAccessTokenRequest.accessTokenRequest[
                "pre-authorized_code"
            ] ?? parsedAccessTokenRequest.accessTokenRequest["code"];
        const session = await this.sessionService
            .getBy({
                authorization_code,
            })
            .catch(() => {
                throw new TokenErrorException(
                    "invalid_grant",
                    "The provided authorization code is invalid or expired",
                );
            });
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        const authorizationServerMetadata = await this.authzMetadata(tenantId);

        // Verify wallet attestation if required or provided
        await this.walletAttestationService.verifyWalletAttestation(
            tenantId,
            parsedAccessTokenRequest.clientAttestation,
            authorizationServerMetadata.issuer,
            issuanceConfig.walletAttestationRequired ?? false,
            issuanceConfig.walletProviderTrustLists ?? [],
        );

        let dpopValue;

        if (
            parsedAccessTokenRequest.grant.grantType ===
            preAuthorizedCodeGrantIdentifier
        ) {
            const { dpop } = await this.getAuthorizationServer(
                tenantId,
                session.id,
            )
                .verifyPreAuthorizedCodeAccessTokenRequest({
                    grant: parsedAccessTokenRequest.grant as ParsedAccessTokenPreAuthorizedCodeRequestGrant,
                    accessTokenRequest:
                        parsedAccessTokenRequest.accessTokenRequest,
                    request: {
                        method: req.method as HttpMethod,
                        url,
                        headers: getHeadersFromRequest(req),
                    },
                    dpop: {
                        required: issuanceConfig.dPopRequired,
                        allowedSigningAlgs:
                            authorizationServerMetadata.dpop_signing_alg_values_supported,
                        jwt: parsedAccessTokenRequest.dpop?.jwt,
                    },

                    authorizationServerMetadata,

                    expectedPreAuthorizedCode: session.authorization_code!,
                    expectedTxCode: session.credentialPayload?.tx_code,
                })
                .catch((err) => {
                    // Map verification errors to OAuth 2.0 error codes
                    const errorCode = this.mapToTokenErrorCode(err.error);
                    throw new TokenErrorException(
                        errorCode,
                        err.error_description,
                    );
                });
            dpopValue = dpop;
        }

        if (
            parsedAccessTokenRequest.grant.grantType ===
            authorizationCodeGrantIdentifier
        ) {
            //TODO: handle response
            const { dpop } = await this.getAuthorizationServer(
                tenantId,
                session.id,
            )
                .verifyAuthorizationCodeAccessTokenRequest({
                    grant: parsedAccessTokenRequest.grant as ParsedAccessTokenAuthorizationCodeRequestGrant,
                    accessTokenRequest:
                        parsedAccessTokenRequest.accessTokenRequest,
                    expectedCode: session.authorization_code as string,
                    request: {
                        method: req.method as HttpMethod,
                        url,
                        headers: getHeadersFromRequest(req),
                    },
                    dpop: {
                        required: issuanceConfig.dPopRequired,
                        allowedSigningAlgs:
                            authorizationServerMetadata.dpop_signing_alg_values_supported,
                        jwt: parsedAccessTokenRequest.dpop?.jwt,
                    },
                    authorizationServerMetadata,
                })
                .catch((err) => {
                    // Map verification errors to OAuth 2.0 error codes
                    const errorCode = this.mapToTokenErrorCode(err.error);
                    throw new TokenErrorException(
                        errorCode,
                        err.error_description,
                    );
                });
            dpopValue = dpop;
        }

        // Use pinned key from issuance config, or fall back to first available key
        const signingKeyId =
            issuanceConfig.signingKeyId ||
            (await this.keyChainService.getKid(tenantId));

        const publicKey = await this.keyChainService.getPublicKey(
            "jwk",
            tenantId,
            signingKeyId,
        );

        return this.getAuthorizationServer(tenantId, session.id)
            .createAccessTokenResponse({
                audience: `${this.configService.getOrThrow<string>("PUBLIC_URL")}/issuers/${tenantId}`,
                signer: {
                    method: "jwk",
                    alg: "ES256",
                    publicJwk: publicKey as Jwk,
                    kid: signingKeyId,
                },
                subject: session.id,
                expiresInSeconds: 300,
                authorizationServer: authorizationServerMetadata.issuer,
                clientId: req.body.client_id,
                dpop: dpopValue,
                refreshToken: true,
            })
            .catch((err) => {
                this.logger.error("Error creating access token response:", err);
                // Internal errors during token response creation
                throw new TokenErrorException(
                    "invalid_request",
                    "Failed to create access token response",
                );
            });
    }

    /**
     * Set the authorization code for a session based on the issuer_state and return the code.
     * @param issuer_state
     * @returns
     */
    async setAuthCode(issuer_state: string) {
        const code = randomUUID();
        await this.sessionService.add(issuer_state, {
            authorization_code: code,
        });
        return code;
    }
}
