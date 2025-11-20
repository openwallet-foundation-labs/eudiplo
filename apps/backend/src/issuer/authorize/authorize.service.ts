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
import { v4 } from "uuid";
import { CryptoService } from "../../crypto/crypto.service";
import { Session } from "../../session/entities/session.entity";
import { SessionService } from "../../session/session.service";
import { WebhookConfig } from "../../utils/webhook/webhook.dto";
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
        private sessionService: SessionService,
        private issuanceService: IssuanceService,
    ) {}

    getAuthorizationServer(tenantId: string): Oauth2AuthorizationServer {
        const callbacks = this.cryptoService.getCallbackContext(tenantId);
        return new Oauth2AuthorizationServer({
            callbacks,
        });
    }

    authzMetadata(tenantId: string): AuthorizationServerMetadata {
        //TODO: read from config
        const useDpop = true;

        const authServer =
            this.configService.getOrThrow<string>("PUBLIC_URL") +
            `/${tenantId}`;
        return this.getAuthorizationServer(
            tenantId,
        ).createAuthorizationServerMetadata({
            issuer: authServer,
            token_endpoint: `${authServer}/authorize/token`,
            authorization_endpoint: `${authServer}/authorize`,
            jwks_uri: `${authServer}/.well-known/jwks.json`,
            dpop_signing_alg_values_supported: useDpop ? ["ES256"] : undefined,
            // TODO: verify this on the server
            require_pushed_authorization_requests: true,
            pushed_authorization_request_endpoint: `${authServer}/authorize/par`,
            code_challenge_methods_supported: [PkceCodeChallengeMethod.S256],
            authorization_challenge_endpoint: `${authServer}/authorize/challenge`,
            client_attestation_pop_nonce_required: true,
            authorization_details_types_supported: ["openid_credential"],
            token_endpoint_auth_methods_supported: ["attest_jwt_client_auth"],
            /*         token_endpoint_auth_methods_supported: [
          SupportedAuthenticationScheme.ClientAttestationJwt,          
        ], */
        });
    }

    sendAuthorizationResponse(values: AuthorizeQueries, tenantId) {
        console.log(values);
        if (values.request_uri) {
            return this.sessionService
                .getBy({ request_uri: values.request_uri })
                .then(async (session) => {
                    //values = session.auth_queries!;
                    const code = await this.setAuthCode(values.issuer_state!);
                    return `${session.auth_queries!.redirect_uri}?code=${code}`;
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

    async validateTokenRequest(
        body: any,
        req: Request,
        tenantId: string,
    ): Promise<any> {
        const url = `${this.configService.getOrThrow<string>("PUBLIC_URL")}${req.url}`;
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
        const authorization_code =
            parsedAccessTokenRequest.accessTokenRequest[
                "pre-authorized_code"
            ] ?? parsedAccessTokenRequest.accessTokenRequest["code"];
        console.log(authorization_code);
        const session = await this.sessionService
            .getBy({
                authorization_code,
            })
            .catch((err) => {
                console.log(err);
                throw new ConflictException("Invalid authorization code");
            });
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId);

        const authorizationServerMetadata = await this.authzMetadata(tenantId);
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
            audience: `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${tenantId}`,
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

    parseChallengeRequest(
        body: AuthorizeQueries,
        session: Session,
        origin: string,
        webhook?: WebhookConfig,
    ) {
        throw new Error("Not implemented");
        /* // re using the issuer state as auth session
        const auth_session = body.issuer_state;
        //use the issuanceId to get the presentationId.
        const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(
                session.tenantId,
            ); */
        /* const presentationConfig = (
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
        return res;*/
    }

    async authorizationChallengeEndpoint(
        res: Response<any, Record<string, any>>,
        body: AuthorizeQueries,
        tenantId: string,
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
            /* if (session.credentials) {
                await this.sendAuthorizationCode(res, body.auth_session);
                return;
            } else {
                //TODO: needs to be checked if this is the correct response
                throw new ConflictException(
                    "Session does not have valid credentials for issuance",
                );
            } */
        }

        /* const session = await this.sessionService.get(body.issuer_state!);
        if (!session) {
            throw new Error('Credential offer not found');
        } */
        /* const issuanceConfig =
            await this.issuanceService.getIssuanceConfiguration(tenantId); */

        await this.sendAuthorizationCode(res, body.issuer_state!);
        /* switch (authConfig.method) {
            case "presentationDuringIssuance": {
                throw new Error("Not implemented");
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
                
                break;
            case "none":
                await this.sendAuthorizationCode(res, body.issuer_state!);
                break;
            default:
                throw new Error(
                    `Unsupported authentication method: ${(authConfig as any).method}`,
                ); 
        }*/
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
