import { randomUUID, X509Certificate } from "node:crypto";
import {
    ConflictException,
    Injectable,
    Logger,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
import { Openid4vciIssuer } from "@openid4vc/openid4vci";
import * as x509 from "@peculiar/x509";
import type { Request } from "express";
import { decodeProtectedHeader, JWK } from "jose";
import { v4 } from "uuid";
import { CryptoService } from "../../../../crypto/crypto.service";
import { CryptoImplementationService } from "../../../../crypto/key/crypto-implementation/crypto-implementation.service";
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
import { IssuanceService } from "../../../configuration/issuance/issuance.service";
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
        private readonly cryptoImplementationService: CryptoImplementationService,
        private readonly sessionService: SessionService,
        private readonly issuanceService: IssuanceService,
        private readonly trustStoreService: TrustStoreService,
        private readonly x509ValidationService: X509ValidationService,
        private readonly statusListVerifierService: StatusListVerifierService,
    ) {}

    /**
     * Get the OID4VCI issuer instance for a specific tenant.
     * Used for wallet attestation verification.
     * @param tenantId The ID of the tenant.
     * @returns The OID4VCI issuer instance.
     */
    private getIssuer(tenantId: string): Openid4vciIssuer {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
        return new Openid4vciIssuer({
            callbacks,
        });
    }

    /**
     * Verify wallet attestation if provided or required.
     * Validates the attestation JWT signature, checks the X.509 certificate chain
     * against configured trust lists, and verifies the status list if present.
     * @param tenantId The tenant ID
     * @param clientAttestation The client attestation from the token request
     * @param authorizationServer The authorization server URL
     * @param walletAttestationRequired Whether wallet attestation is required
     * @param walletProviderTrustLists URLs of trust lists containing trusted wallet providers
     * @throws UnauthorizedException if attestation is required but not provided, or if provided but invalid
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
            // Pass the matched entity and trust store for signature verification
            await this.validateWalletAttestationStatus(
                clientAttestation.clientAttestationJwt,
                matchedEntity,
                trustStore,
            );
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
     * Validate the status of a wallet attestation JWT if it contains a status claim.
     * The status claim is optional per the spec, so if not present, validation passes.
     * Also verifies that the status list JWT is signed by the revocation certificate
     * from the same trusted entity that issued the wallet attestation.
     * @param clientAttestationJwt The wallet attestation JWT
     * @param matchedEntity The matched trusted entity from certificate validation
     * @param trustStore The trust store used for validation
     * @throws UnauthorizedException if the attestation has been revoked or suspended
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

            // Now check the actual status value
            const statusResult =
                await this.statusListVerifierService.checkStatus(
                    statusEntry.uri,
                    statusEntry.idx,
                );

            // Check if the status indicates the attestation is valid
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
            // and network issues shouldn't block valid attestations
            this.logger.warn(
                `Failed to check wallet attestation status: ${err instanceof Error ? err.message : "Unknown error"}`,
            );
        }
    }

    /**
     * Verify the signature of a status list JWT against the revocation certificate
     * from the matched trusted entity.
     * @param statusListJwt The status list JWT to verify
     * @param matchedEntity The matched trusted entity
     * @param trustStore The trust store
     * @returns true if the signature is valid and from the trusted revocation cert
     */
    private async verifyStatusListSignature(
        statusListJwt: string,
        matchedEntity: MatchedTrustedEntity | null,
        trustStore: BuiltTrustStore | null,
    ): Promise<boolean> {
        try {
            // Parse the status list JWT header
            const header = decodeProtectedHeader(statusListJwt);
            const x5c = header.x5c;

            // Extract public key from x5c and verify signature
            if (!x5c || x5c.length === 0) {
                // If no x5c in status list, we can't verify against trust chain
                // Accept if no trust validation is configured
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

            // Split JWT and verify
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

            // If no entity was matched (no trust list configured), accept if signature is valid
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

            // Get all certs for path building
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

            // Check if the status list is signed by the revocation cert from the same entity
            const revocationThumb = matchedEntity.revocationThumbprint!;
            const revocationIsCa = this.x509ValidationService.isCaCert(
                matchedEntity.revocationCert,
            );

            let statusMatchesRevocation = false;

            if (revocationIsCa) {
                // Revocation cert is CA: path must terminate at this cert
                statusMatchesRevocation = revocationThumb === statusEndThumb;
            } else {
                // Revocation cert is pinned (non-CA): leaf must match
                statusMatchesRevocation = revocationThumb === statusLeafThumb;
            }

            if (!statusMatchesRevocation) {
                this.logger.warn(
                    `Status list is NOT signed by the revocation certificate from the same TrustedEntity. ` +
                        `Entity: ${matchedEntity.entity.entityId ?? "unknown"}, ` +
                        `Expected revocation cert: ${revocationThumb}, ` +
                        `Status list leaf cert: ${statusLeafThumb}, ` +
                        `Status list end cert: ${statusEndThumb}`,
                );
                return false;
            }

            this.logger.debug(
                `Status list verified against revocation cert from entity: ${matchedEntity.entity.entityId ?? "unknown"}`,
            );
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
     * Validate the wallet provider's X.509 certificate against configured trust lists.
     * Returns the matched entity and trust store for use in status list verification.
     * @param clientAttestationJwt The wallet attestation JWT
     * @param trustListUrls URLs of trust lists to validate against
     * @returns The matched entity and trust store (both null if no trust lists configured)
     * @throws UnauthorizedException if certificate is not trusted
     */
    private async validateWalletProviderCertificate(
        clientAttestationJwt: string,
        trustListUrls: string[],
    ): Promise<{
        matchedEntity: MatchedTrustedEntity | null;
        trustStore: BuiltTrustStore | null;
    }> {
        if (trustListUrls.length === 0) {
            // No trust lists configured - accept any valid attestation
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

            // Check if the path matches any trusted entity (using WalletProvider service type)
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

    getAuthorizationServer(tenantId: string): Oauth2AuthorizationServer {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
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
        return `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${tenantId}`;
    }

    authzMetadata(tenantId: string): AuthorizationServerMetadata {
        //TODO: read from config
        const useDpop = true;

        const authServer = this.getAuthzIssuer(tenantId);
        return this.getAuthorizationServer(
            tenantId,
        ).createAuthorizationServerMetadata({
            issuer: authServer,
            token_endpoint: `${authServer}/authorize/token`,
            authorization_endpoint: `${authServer}/authorize`,
            interactive_authorization_endpoint: `${authServer}/authorize/interactive`,
            jwks_uri: `${authServer}/.well-known/jwks.json`,
            dpop_signing_alg_values_supported: useDpop ? ["ES256"] : undefined,
            // TODO: verify this on the server
            require_pushed_authorization_requests: true,
            pushed_authorization_request_endpoint: `${authServer}/authorize/par`,
            code_challenge_methods_supported: [PkceCodeChallengeMethod.S256],
            client_attestation_pop_nonce_required: true,
            authorization_details_types_supported: ["openid_credential"],
            token_endpoint_auth_methods_supported: ["attest_jwt_client_auth"],
            client_attestation_signing_alg_values_supported: ["ES256"],
            client_attestation_pop_signing_alg_values_supported: ["ES256"],
        } as AuthorizationServerMetadata);
    }

    sendAuthorizationResponse(values: AuthorizeQueries, tenantId) {
        if (values.request_uri) {
            return this.sessionService
                .getBy({ request_uri: values.request_uri })
                .then(async (session) => {
                    const code = await this.setAuthCode(session.id);
                    const iss = `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${tenantId}`;
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
        await this.verifyWalletAttestation(
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
            const { dpop } = await this.getAuthorizationServer(tenantId)
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
            const { dpop } = await this.getAuthorizationServer(tenantId)
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

        return this.getAuthorizationServer(tenantId)
            .createAccessTokenResponse({
                audience: `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${tenantId}`,
                signer: {
                    method: "jwk",
                    alg: "ES256",
                    publicJwk:
                        (await this.cryptoService.keyService.getPublicKey(
                            "jwk",
                            tenantId,
                        )) as Jwk,
                },
                subject: session.id,
                expiresInSeconds: 300,
                authorizationServer: authorizationServerMetadata.issuer,
                clientId: req.body.client_id,
                dpop: dpopValue,
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
