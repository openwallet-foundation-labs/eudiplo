import { randomUUID } from "node:crypto";
import { ConflictException, Injectable } from "@nestjs/common";
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
import type { Request, Response } from "express";
import { CryptoService } from "../../crypto/crypto.service";
import { Session } from "../../session/entities/session.entity";
import { SessionService } from "../../session/session.service";
import { WebhookConfig } from "../../utils/webhook/webhook.dto";
import { Oid4vpService } from "../../verifier/oid4vp/oid4vp.service";
import { AuthenticationMethodPresentation } from "../issuance/dto/authentication-config.dto";
import { IssuanceService } from "../issuance/issuance.service";
import { getHeadersFromRequest } from "../oid4vci/util";
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
    //public authorizationServer: Oauth2AuthorizationServer;

    constructor(
        private configService: ConfigService,
        private cryptoService: CryptoService,
        private oid4vpService: Oid4vpService,
        private sessionService: SessionService,
        private issuanceService: IssuanceService,
    ) {}

    getAuthorizationServer(tenantId: string): Oauth2AuthorizationServer {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
        return new Oauth2AuthorizationServer({
            callbacks,
        });
    }

    async authzMetadata(
        session: Session,
    ): Promise<AuthorizationServerMetadata> {
        const authServer =
            this.configService.getOrThrow<string>("PUBLIC_URL") +
            `/${session.id}`;
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfigurationById(
                session.issuanceId!,
                session.tenantId,
            );
        return this.getAuthorizationServer(
            session.tenantId,
        ).createAuthorizationServerMetadata({
            issuer: authServer,
            token_endpoint: `${authServer}/authorize/token`,
            authorization_endpoint: `${authServer}/authorize`,
            jwks_uri: `${authServer}/.well-known/jwks.json`,
            dpop_signing_alg_values_supported: issuanceConfig.dPopRequired
                ? ["ES256"]
                : undefined,
            // TODO: verify this on the server
            require_pushed_authorization_requests: true,
            pushed_authorization_request_endpoint: `${authServer}/authorize/par`,
            code_challenge_methods_supported: [PkceCodeChallengeMethod.S256],
            authorization_challenge_endpoint: `${authServer}/authorize/challenge`,
            /*         token_endpoint_auth_methods_supported: [
          SupportedAuthenticationScheme.ClientAttestationJwt,
        ], */
        });
    }

    async sendAuthorizationResponse(
        queries: AuthorizeQueries,
        res: Response<any, Record<string, any>>,
    ) {
        let values = queries;
        if (queries.request_uri) {
            await this.sessionService
                .getBy({ request_uri: queries.request_uri })
                .then((session) => {
                    values = session.auth_queries!;
                })
                .catch(() => {
                    throw new ConflictException(
                        "request_uri not found or not provided in the request",
                    );
                });
        } else {
            throw new ConflictException(
                "request_uri not found or not provided in the request",
            );
        }
        const code = await this.setAuthCode(values.issuer_state!);
        res.redirect(`${values.redirect_uri}?code=${code}`);
    }

    async validateTokenRequest(
        body: any,
        req: Request,
        session: Session,
    ): Promise<any> {
        const url = `${this.configService.getOrThrow<string>("PUBLIC_URL")}${req.url}`;
        const tenantId = session.tenantId;
        const parsedAccessTokenRequest = this.getAuthorizationServer(
            tenantId,
        ).parseAccessTokenRequest({
            accessTokenRequest: body,
            request: {
                method: req.method as HttpMethod,
                url,
                headers: getHeadersFromRequest(req),
            },
        });

        const issuanceConfig =
            await this.issuanceService.getIssuanceConfigurationById(
                session.issuanceId!,
                session.tenantId,
            );

        const authorizationServerMetadata = await this.authzMetadata(session);
        let dpopValue;
        if (
            parsedAccessTokenRequest.grant.grantType ===
            preAuthorizedCodeGrantIdentifier
        ) {
            const { dpop } = await this.getAuthorizationServer(
                tenantId,
            ).verifyPreAuthorizedCodeAccessTokenRequest({
                grant: parsedAccessTokenRequest.grant as ParsedAccessTokenPreAuthorizedCodeRequestGrant,
                accessTokenRequest: parsedAccessTokenRequest.accessTokenRequest,
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

                expectedPreAuthorizedCode:
                    parsedAccessTokenRequest.grant.preAuthorizedCode,
                expectedTxCode: parsedAccessTokenRequest.grant.txCode,
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
            ).verifyAuthorizationCodeAccessTokenRequest({
                grant: parsedAccessTokenRequest.grant as ParsedAccessTokenAuthorizationCodeRequestGrant,
                accessTokenRequest: parsedAccessTokenRequest.accessTokenRequest,
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
            });
            dpopValue = dpop;
        }
        //const cNonce = randomUUID();
        return this.getAuthorizationServer(tenantId).createAccessTokenResponse({
            audience: `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${session.id}`,
            signer: {
                method: "jwk",
                alg: "ES256",
                publicJwk: (await this.cryptoService.keyService.getPublicKey(
                    "jwk",
                    tenantId,
                )) as Jwk,
            },
            subject: session.id,
            expiresInSeconds: 300,
            authorizationServer: authorizationServerMetadata.issuer,
            /* cNonce,
            cNonceExpiresIn: 100, */
            clientId: req.body.client_id,
            dpop: dpopValue,
        });
    }

    async parseChallengeRequest(
        body: AuthorizeQueries,
        session: Session,
        origin: string,
        webhook?: WebhookConfig,
    ) {
        // re using the issuer state as auth session
        const auth_session = body.issuer_state;
        //use the issuanceId to get the presentationId.
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfigurationById(
                session.issuanceId!,
                session.tenantId,
            );
        const presentationConfig = (
            issuanceConfig.authenticationConfig as AuthenticationMethodPresentation
        ).config.type;
        const presentation = `openid4vp://?${(await this.oid4vpService.createRequest(presentationConfig, { session: auth_session, webhook }, session.tenantId, session.useDcApi, origin)).uri}`;
        const res = {
            error: "insufficient_authorization",
            auth_session,
            presentation,
            error_description:
                "Presentation of credential required before issuance",
        };
        return res;
    }

    async authorizationChallengeEndpoint(
        res: Response<any, Record<string, any>>,
        body: AuthorizeQueries,
        session: Session,
        origin: string,
    ) {
        // auth session and issuer state have the same value
        if (body.auth_session) {
            /* const session = await this.sessionService.get(body.auth_session);
            // if session is not found, we assume that the auth session is the
            if (!session) {
                throw new ConflictException(
                    'auth_session not found or not provided in the request',
                );
            }
 */
            //check if session has valid presentation, we assume for now
            if (session.credentials) {
                await this.sendAuthorizationCode(res, body.auth_session);
                return;
            } else {
                //TODO: needs to be checked if this is the correct response
                throw new ConflictException(
                    "Session does not have valid credentials for issuance",
                );
            }
        }

        /* const session = await this.sessionService.get(body.issuer_state!);
        if (!session) {
            throw new Error('Credential offer not found');
        } */
        const issuanceId = session.issuanceId!;
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfigurationById(
                issuanceId,
                session.tenantId,
            );

        // Use the new authentication configuration structure
        const authConfig = issuanceConfig.authenticationConfig;

        if (!authConfig) {
            throw new Error(
                "No authentication configuration found for issuance config",
            );
        }

        switch (authConfig.method) {
            case "presentationDuringIssuance": {
                // OID4VP flow - credential presentation required
                const webhook = issuanceConfig.claimsWebhook;
                const response = await this.parseChallengeRequest(
                    body,
                    session,
                    origin,
                    webhook,
                );
                res.status(400).send(response);
                break;
            }
            case "auth":
                await this.sendAuthorizationCode(res, body.issuer_state!);
                break;
            case "none":
                await this.sendAuthorizationCode(res, body.issuer_state!);
                break;
            default:
                throw new Error(
                    `Unsupported authentication method: ${(authConfig as any).method}`,
                );
        }
    }

    private async sendAuthorizationCode(res: Response, issuer_state: string) {
        const authorization_code = await this.setAuthCode(issuer_state);
        res.send({
            authorization_code,
        });
    }

    async setAuthCode(issuer_state: string) {
        const code = randomUUID();
        await this.sessionService.add(issuer_state, {
            authorization_code: code,
        });
        return code;
    }
}
