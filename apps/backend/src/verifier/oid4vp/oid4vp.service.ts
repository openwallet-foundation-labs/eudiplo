import { randomUUID } from "node:crypto";
import { ConflictException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v4 } from "uuid";
import { CryptoService } from "../../crypto/crypto.service";
import { EncryptionService } from "../../crypto/encryption/encryption.service";
import { OfferResponse } from "../../issuer/oid4vci/dto/offer-request.dto";
import { RegistrarService } from "../../registrar/registrar.service";
import { Session } from "../../session/entities/session.entity";
import { SessionService } from "../../session/session.service";
import { SessionLoggerService } from "../../utils/logger/session-logger.service";
import { SessionLogContext } from "../../utils/logger/session-logger-context";
import { WebhookService } from "../../utils/webhook/webhook.service";
import { AuthResponse } from "../presentations/dto/auth-response.dto";
import { PresentationsService } from "../presentations/presentations.service";
import { AuthorizationResponse } from "./dto/authorization-response.dto";
import { PresentationRequestOptions } from "./dto/presentation-request-options.dto";

@Injectable()
export class Oid4vpService {
    constructor(
        private cryptoService: CryptoService,
        private encryptionService: EncryptionService,
        private configService: ConfigService,
        private registrarService: RegistrarService,
        private presentationsService: PresentationsService,
        private sessionService: SessionService,
        private sessionLogger: SessionLoggerService,
        private webhookService: WebhookService,
    ) {}

    /**
     * Creates an authorization request for the OID4VP flow.
     * This method generates a JWT that includes the necessary parameters for the authorization request.
     * It initializes the session logging context and logs the start of the flow.
     * @param requestId
     * @param tenantId
     * @param auth_session
     * @returns
     */
    async createAuthorizationRequest(session: Session): Promise<string> {
        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId: session.tenantId,
            flowType: "OID4VP",
            stage: "authorization_request",
        };

        this.sessionLogger.logFlowStart(logContext, {
            requestId: session.requestId,
            action: "create_authorization_request",
        });

        try {
            const host = this.configService.getOrThrow<string>("PUBLIC_URL");
            const tenantHost = `${host}/${session.tenantId}`;

            const presentationConfig =
                await this.presentationsService.getPresentationConfig(
                    session.requestId!,
                    session.tenantId,
                );
            let regCert: string | undefined = undefined;

            const dcql_query = JSON.parse(
                JSON.stringify(presentationConfig.dcql_query).replace(
                    /<PUBLIC_URL>/g,
                    tenantHost,
                ),
            );

            if (this.registrarService.isEnabled()) {
                const registrationCert = JSON.parse(
                    JSON.stringify(presentationConfig.registrationCert).replace(
                        /<PUBLIC_URL>/g,
                        tenantHost,
                    ),
                );
                regCert =
                    await this.registrarService.addRegistrationCertificate(
                        registrationCert,
                        dcql_query,
                        session.requestId!,
                        session.tenantId,
                    );
            }
            const nonce = randomUUID();
            await this.sessionService.add(session.id, {
                vp_nonce: nonce,
            });

            this.sessionLogger.logAuthorizationRequest(logContext, {
                requestId: session.requestId,
                nonce,
                regCert,
                dcqlQueryCount: Array.isArray(dcql_query)
                    ? dcql_query.length
                    : 1,
            });

            const hostname = new URL(
                this.configService.getOrThrow<string>("PUBLIC_URL"),
            ).hostname;

            const lifeTime = 60 * 60;

            const request = {
                payload: {
                    response_type: "vp_token",
                    client_id: "x509_san_dns:" + hostname,
                    response_uri: `${host}/${session.id}/oid4vp`,
                    response_mode: "direct_post.jwt",
                    nonce,
                    dcql_query,
                    client_metadata: {
                        jwks: {
                            keys: [
                                await this.encryptionService.getEncryptionPublicKey(
                                    session.tenantId,
                                ),
                            ],
                        },
                        vp_formats: {
                            mso_mdoc: {
                                alg: ["ES256"],
                            },
                            "dc+sd-jwt": {
                                "kb-jwt_alg_values": ["ES256"],
                                "sd-jwt_alg_values": ["ES256"],
                            },
                        },
                        authorization_encrypted_response_alg: "ECDH-ES",
                        authorization_encrypted_response_enc: "A128GCM",
                        client_name:
                            this.configService.getOrThrow<string>("RP_NAME"),
                        response_types_supported: ["vp_token"],
                    },
                    state: session.id,
                    aud: host,
                    exp: Math.floor(Date.now() / 1000) + lifeTime,
                    iat: Math.floor(new Date().getTime() / 1000),
                    verifier_attestations: regCert
                        ? [
                              {
                                  format: "jwt",
                                  data: regCert,
                              },
                          ]
                        : undefined,
                },
                header: {
                    typ: "oauth-authz-req+jwt",
                },
            };

            const accessCert = await this.cryptoService.getCertChain(
                "access",
                session.tenantId,
            );

            const header = {
                ...request.header,
                alg: "ES256",
                x5c: accessCert,
            };

            const keyId = await this.cryptoService.keyService.getKid(
                session.tenantId,
                "access",
            );
            const signedJwt = await this.cryptoService.signJwt(
                header,
                request.payload,
                session.tenantId,
                keyId,
            );

            this.sessionLogger.logSession(
                logContext,
                "Authorization request created successfully",
                {
                    signedJwtLength: signedJwt.length,
                    certificateChainLength: accessCert?.length || 0,
                },
            );

            return signedJwt;
        } catch (error) {
            this.sessionLogger.logFlowError(logContext, error as Error, {
                requestId: session.requestId,
                action: "create_authorization_request",
            });
            throw error;
        }
    }

    /**
     * Creates a request for the OID4VP flow.
     * @param requestId
     * @param values
     * @param tenantId
     * @returns
     */
    async createRequest(
        requestId: string,
        values: PresentationRequestOptions,
        tenantId: string,
    ): Promise<OfferResponse> {
        const presentationConfig =
            await this.presentationsService.getPresentationConfig(
                requestId,
                tenantId,
            );
        const fresh = values.session === undefined;
        values.session = values.session || v4();

        const hostname = new URL(
            this.configService.getOrThrow<string>("PUBLIC_URL"),
        ).hostname;
        const params = {
            client_id: `x509_san_dns:${hostname}`,
            request_uri: `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${values.session}/oid4vp`,
        };
        const queryString = Object.entries(params)
            .map(
                ([key, value]) =>
                    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
            )
            .join("&");

        const expiresAt = new Date(
            Date.now() + presentationConfig.lifeTime * 1000,
        );

        if (fresh) {
            await this.sessionService.create({
                id: values.session,
                claimsWebhook: values.webhook ?? presentationConfig.webhook,
                tenantId,
                requestId,
                requestUrl: `openid4vp://?${queryString}`,
                expiresAt,
            });
        } else {
            await this.sessionService.add(values.session, {
                claimsWebhook: values.webhook ?? presentationConfig.webhook,
                requestUrl: `openid4vp://?${queryString}`,
                expiresAt,
            });
        }

        return {
            uri: queryString,
            session: values.session,
        };
    }

    /**
     * Processes the response from the wallet.
     * @param body
     * @param tenantId
     */
    async getResponse(body: AuthorizationResponse, session: Session) {
        const res = await this.encryptionService.decryptJwe<AuthResponse>(
            body.response,
            session.tenantId,
        );
        if (!res.state) {
            throw new ConflictException("No state found in the response");
        }

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: res.state,
            tenantId: session.tenantId,
            flowType: "OID4VP",
            stage: "response_processing",
        };

        this.sessionLogger.logFlowStart(logContext, {
            action: "process_presentation_response",
            hasWebhook: !!session.claimsWebhook,
        });

        try {
            //TODO: load required fields from the config
            const credentials = await this.presentationsService.parseResponse(
                res,
                [],
                session.vp_nonce as string,
            );

            this.sessionLogger.logCredentialVerification(
                logContext,
                !!credentials && credentials.length > 0,
                {
                    credentialCount: credentials?.length || 0,
                    nonce: session.vp_nonce,
                },
            );

            //tell the auth server the result of the session.
            await this.sessionService.add(res.state, {
                //TODO: not clear why it has to be any
                credentials: credentials as any,
            });
            // if there a a webook URL, send the response there
            //TODO: move to dedicated service to reuse it also in the oid4vci flow.
            if (session.claimsWebhook) {
                await this.webhookService.sendWebhook(
                    session,
                    logContext,
                    credentials,
                    false,
                );
            }

            this.sessionLogger.logFlowComplete(logContext, {
                credentialCount: credentials?.length || 0,
                webhookSent: !!session.claimsWebhook,
            });
        } catch (error) {
            this.sessionLogger.logFlowError(logContext, error as Error, {
                action: "process_presentation_response",
            });
            throw error;
        }
    }
}
