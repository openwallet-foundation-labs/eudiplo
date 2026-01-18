import { randomUUID } from "node:crypto";
import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v4 } from "uuid";
import { EncryptionService } from "../../crypto/encryption/encryption.service";
import { CertService } from "../../crypto/key/cert/cert.service";
import { CryptoImplementationService } from "../../crypto/key/crypto-implementation/crypto-implementation.service";
import { CertUsage } from "../../crypto/key/entities/cert-usage.entity";
import { KeyService } from "../../crypto/key/key.service";
import { OfferResponse } from "../../issuer/issuance/oid4vci/dto/offer-request.dto";
import { RegistrarService } from "../../registrar/registrar.service";
import { SessionStatus } from "../../session/entities/session.entity";
import { SessionService } from "../../session/session.service";
import { SessionLoggerService } from "../../shared/utils/logger/session-logger.service";
import { SessionLogContext } from "../../shared/utils/logger/session-logger-context";
import { WebhookService } from "../../shared/utils/webhook/webhook.service";
import { AuthResponse } from "../presentations/dto/auth-response.dto";
import { PresentationsService } from "../presentations/presentations.service";
import { AuthorizationResponse } from "./dto/authorization-response.dto";
import { PresentationRequestOptions } from "./dto/presentation-request-options.dto";

@Injectable()
export class Oid4vpService {
    constructor(
        private readonly certService: CertService,
        @Inject("KeyService") public readonly keyService: KeyService,
        private readonly encryptionService: EncryptionService,
        private readonly configService: ConfigService,
        private readonly registrarService: RegistrarService,
        private readonly presentationsService: PresentationsService,
        private readonly sessionService: SessionService,
        private readonly sessionLogger: SessionLoggerService,
        private readonly webhookService: WebhookService,
        private readonly cryptoImplementationService: CryptoImplementationService,
    ) {}

    /**
     * Creates an authorization request for the OID4VP flow.
     * This method generates a JWT that includes the necessary parameters for the authorization request.
     * It initializes the session logging context and logs the start of the flow.
     * @param session
     * @param origin
     * @returns
     */
    async createAuthorizationRequest(
        sessionId: string,
        origin: string,
    ): Promise<string> {
        const session = await this.sessionService.get(sessionId);

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
                JSON.stringify(presentationConfig.dcql_query).replaceAll(
                    "<TENANT_URL>",
                    tenantHost,
                ),
            );

            //remove trusted_authorities from dcql
            dcql_query.credentials = dcql_query.credentials.map((cred: any) => {
                const { trusted_authorities, ...rest } = cred;
                return rest;
            });

            if (this.registrarService.isEnabled()) {
                const registrationCert = JSON.parse(
                    JSON.stringify(
                        presentationConfig.registrationCert,
                    ).replaceAll("<TENANT_URL>", tenantHost),
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

            const lifeTime = 60 * 60;

            const cert = await this.certService.find({
                tenantId: session.tenantId,
                type: CertUsage.Access,
                id: presentationConfig.accessCertId ?? undefined,
            });

            const certHash = this.certService.getCertHash(cert);

            const request = {
                payload: {
                    response_type: "vp_token",
                    client_id: "x509_hash:" + certHash,
                    response_uri: session.useDcApi
                        ? undefined
                        : `${host}/${session.id}/oid4vp`,
                    response_mode: session.useDcApi
                        ? "dc_api.jwt"
                        : "direct_post.jwt",
                    nonce,
                    expected_origins: session.useDcApi ? [origin] : undefined,
                    dcql_query,
                    client_metadata: {
                        jwks: {
                            keys: [
                                await this.encryptionService.getEncryptionPublicKey(
                                    session.tenantId,
                                ),
                            ],
                        },
                        vp_formats_supported: {
                            mso_mdoc: {
                                alg: ["ES256", "Ed25519"],
                            },
                            "dc+sd-jwt": {
                                "kb-jwt_alg_values":
                                    this.cryptoImplementationService.getSupportedAlgorithms(),
                                "sd-jwt_alg_values":
                                    this.cryptoImplementationService.getSupportedAlgorithms(),
                            },
                        },
                        encrypted_response_enc_values_supported: ["A128GCM"],
                    },
                    state: session.useDcApi ? undefined : session.id,
                    //TODO: check if this value is correct accroding to https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-aud-of-a-request-object
                    aud: "https://self-issued.me/v2",
                    exp: Math.floor(Date.now() / 1000) + lifeTime,
                    iat: Math.floor(Date.now() / 1000),
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

            const header = {
                ...request.header,
                alg: "ES256",
                x5c: this.certService.getCertChain(cert),
            };

            const signedJwt = await this.keyService.signJWT(
                request.payload,
                header,
                session.tenantId,
                cert.keyId,
            );

            this.sessionLogger.logSession(
                logContext,
                "Authorization request created successfully",
                {
                    certificateId: cert.id,
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
        useDcApi: boolean,
        origin: string,
    ): Promise<OfferResponse> {
        const presentationConfig =
            await this.presentationsService.getPresentationConfig(
                requestId,
                tenantId,
            );
        const fresh = values.session === undefined;
        values.session = values.session || v4();

        const request_uri_method: "get" | "post" = "get";

        const cert = await this.certService.find({
            tenantId: tenantId,
            type: CertUsage.Access,
        });

        const certHash = this.certService.getCertHash(cert);

        const params = {
            client_id: "x509_hash:" + certHash,
            request_uri: `${this.configService.getOrThrow<string>("PUBLIC_URL")}/${values.session}/oid4vp/request`,
            request_uri_method,
        };
        const queryString = Object.entries(params)
            .map(
                ([key, value]) =>
                    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
            )
            .join("&");

        const expiresAt = new Date(
            Date.now() + (presentationConfig.lifeTime ?? 300) * 1000,
        );

        if (fresh) {
            const host = this.configService.getOrThrow<string>("PUBLIC_URL");
            const clientId = "x509_hash:" + certHash;
            const responseUri = useDcApi
                ? undefined
                : `${host}/${values.session}/oid4vp`;

            const session = await this.sessionService.create({
                id: values.session,
                parsedWebhook: values.webhook,
                redirectUri:
                    values.redirectUri ??
                    presentationConfig.redirectUri ??
                    undefined,
                tenantId,
                requestId,
                requestUrl: `openid4vp://?${queryString}`,
                expiresAt,
                useDcApi,
                clientId,
                responseUri,
            });

            if (request_uri_method === "get") {
                const signedJwt = await this.createAuthorizationRequest(
                    session.id,
                    origin,
                );
                this.sessionService.add(values.session, {
                    requestObject: signedJwt,
                });
            }
        } else {
            await this.sessionService.add(values.session, {
                //claimsWebhook: values.webhook ?? presentationConfig.webhook,
                requestUrl: `openid4vp://?${queryString}`,
                expiresAt,
                useDcApi,
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
    async getResponse(body: AuthorizationResponse, sessionId: string) {
        const session = await this.sessionService.get(sessionId);
        const res = await this.encryptionService.decryptJwe<AuthResponse>(
            body.response,
            session.tenantId,
        );

        //for dc api the state is no longer included in the res, see: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-request

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: session.id,
            tenantId: session.tenantId,
            flowType: "OID4VP",
            stage: "response_processing",
        };

        const presentationConfig =
            await this.presentationsService.getPresentationConfig(
                session.requestId!,
                session.tenantId,
            );
        const webhook = session.parsedWebhook || presentationConfig.webhook;

        this.sessionLogger.logFlowStart(logContext, {
            action: "process_presentation_response",
            hasWebhook: !!webhook,
        });

        try {
            //TODO: load required fields from the config
            const credentials = await this.presentationsService.parseResponse(
                res,
                presentationConfig,
                session,
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
                status: SessionStatus.Completed,
            });
            // if there a a webhook passed in the session, use it
            if (webhook) {
                const response = await this.webhookService
                    .sendWebhook({
                        webhook,
                        logContext,
                        session,
                        credentials,
                        expectResponse: false,
                    })
                    .catch((error) => {
                        this.sessionLogger.logFlowError(
                            logContext,
                            error as Error,
                            {
                                action: "webhook_callback",
                            },
                        );
                    });
                //override it when a redirect URI is returned by the webhook
                if (response?.redirectUri) {
                    session.redirectUri = response.redirectUri;
                }
            }

            this.sessionLogger.logFlowComplete(logContext, {
                credentialCount: credentials?.length || 0,
                webhookSent: !!webhook,
            });

            //check if a redirect URI is defined and return it to the caller. If so, sendResponse is ignored
            if (session.redirectUri) {
                //TODO: not clear with the brackets are encoded
                // Replace {sessionId} placeholder with actual session ID
                const processedRedirectUri = decodeURIComponent(
                    session.redirectUri,
                ).replaceAll("{sessionId}", session.id);
                console.log("Redirecting to URI:", processedRedirectUri);
                return {
                    redirect_uri: processedRedirectUri,
                };
            }

            if (body.sendResponse) {
                return credentials;
            }

            return {};
        } catch (error: any) {
            this.sessionLogger.logFlowError(logContext, error as Error, {
                action: "process_presentation_response",
            });
            throw new BadRequestException(error.message);
        }
    }
}
