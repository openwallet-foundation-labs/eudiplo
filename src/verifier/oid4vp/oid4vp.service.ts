import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { CryptoService } from '../../crypto/crypto.service';
import { AuthorizationResponse } from './dto/authorization-response.dto';
import { RegistrarService } from '../../registrar/registrar.service';
import { PresentationsService } from '../presentations/presentations.service';
import { AuthResponse } from '../presentations/dto/auth-response.dto';
import { EncryptionService } from '../../crypto/encryption/encryption.service';
import { v4 } from 'uuid';
import { SessionService } from '../../session/session.service';
import { OfferResponse } from '../../issuer/oid4vci/dto/offer-request.dto';
import { PresentationRequestOptions } from './dto/presentation-request-options.dto';
import { WebhookService } from '../../utils/webhook/webhook.service';
import { SessionLoggerService } from '../../utils/logger/session-logger.service';
import { SessionLogContext } from '../../utils/logger/session-logger-context';

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
    async createAuthorizationRequest(
        requestId: string,
        tenantId: string,
        auth_session: string,
    ): Promise<string> {
        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: auth_session,
            tenantId,
            flowType: 'OID4VP',
            stage: 'authorization_request',
        };

        this.sessionLogger.logFlowStart(logContext, {
            requestId,
            action: 'create_authorization_request',
        });

        try {
            const host = this.configService.getOrThrow<string>('PUBLIC_URL');
            const tenantUrl = `${host}/${tenantId}`;

            const values =
                await this.presentationsService.getPresentationConfig(
                    requestId,
                    tenantId,
                );
            let regCert: string | undefined = undefined;

            const dcql_query = JSON.parse(
                JSON.stringify(values.dcql_query).replace(
                    /<PUBLIC_URL>/g,
                    tenantUrl,
                ),
            );

            if (this.registrarService.isEnabled()) {
                const registrationCert = JSON.parse(
                    JSON.stringify(values.registrationCert).replace(
                        /<PUBLIC_URL>/g,
                        tenantUrl,
                    ),
                );
                regCert =
                    await this.registrarService.addRegistrationCertificate(
                        registrationCert,
                        dcql_query,
                        requestId,
                        tenantId,
                    );
            }
            const nonce = randomUUID();
            await this.sessionService.add(auth_session, tenantId, {
                vp_nonce: nonce,
            });

            this.sessionLogger.logAuthorizationRequest(logContext, {
                requestId,
                nonce,
                regCert,
                dcqlQueryCount: Array.isArray(dcql_query)
                    ? dcql_query.length
                    : 1,
            });

            const hostname = new URL(
                this.configService.getOrThrow<string>('PUBLIC_URL'),
            ).hostname;

            const request = {
                payload: {
                    response_type: 'vp_token',
                    client_id: 'x509_san_dns:' + hostname,
                    response_uri: `${host}/${tenantId}/oid4vp/response`,
                    response_mode: 'direct_post.jwt',
                    nonce,
                    dcql_query,
                    client_metadata: {
                        jwks: {
                            keys: [
                                this.encryptionService.getEncryptionPublicKey(),
                            ],
                        },
                        vp_formats: {
                            mso_mdoc: {
                                alg: ['EdDSA', 'ES256', 'ES384'],
                            },
                            'dc+sd-jwt': {
                                'kb-jwt_alg_values': [
                                    'EdDSA',
                                    'ES256',
                                    'ES384',
                                    'ES256K',
                                ],
                                'sd-jwt_alg_values': [
                                    'EdDSA',
                                    'ES256',
                                    'ES384',
                                    'ES256K',
                                ],
                            },
                        },
                        authorization_encrypted_response_alg: 'ECDH-ES',
                        authorization_encrypted_response_enc: 'A128GCM',
                        client_name:
                            this.configService.getOrThrow<string>('RP_NAME'),
                        response_types_supported: ['vp_token'],
                    },
                    state: auth_session,
                    aud: host,
                    exp: Math.floor(Date.now() / 1000) + 60 * 5,
                    iat: Math.floor(new Date().getTime() / 1000),
                    verifier_attestations: regCert
                        ? [
                              {
                                  format: 'jwt',
                                  data: regCert,
                              },
                          ]
                        : undefined,
                },
                header: {
                    typ: 'oauth-authz-req+jwt',
                },
            };

            let accessCert: string[] | undefined = undefined;
            try {
                accessCert = this.cryptoService.getCertChain(
                    'access',
                    tenantId,
                );
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (err: any) {
                accessCert = this.cryptoService.getCertChain(
                    'signing',
                    tenantId,
                );
            }

            const header = {
                ...request.header,
                alg: 'ES256',
                x5c: accessCert,
            };

            const signedJwt = await this.cryptoService.signJwt(
                header,
                request.payload,
                tenantId,
            );

            this.sessionLogger.logSession(
                logContext,
                'Authorization request created successfully',
                {
                    signedJwtLength: signedJwt.length,
                    certificateChainLength: accessCert?.length || 0,
                },
            );

            return signedJwt;
        } catch (error) {
            this.sessionLogger.logFlowError(logContext, error as Error, {
                requestId,
                action: 'create_authorization_request',
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

        if (!values.session) {
            values.session = v4();
            await this.sessionService.create({
                id: values.session,
                webhook: values.webhook ?? presentationConfig.webhook,
                tenantId,
            });
        } else {
            await this.sessionService.add(values.session, tenantId, {
                webhook: values.webhook ?? presentationConfig.webhook,
            });
        }

        const hostname = new URL(
            this.configService.getOrThrow<string>('PUBLIC_URL'),
        ).hostname;
        const params = {
            client_id: `x509_san_dns:${hostname}`,
            request_uri: `${this.configService.getOrThrow<string>('PUBLIC_URL')}/${tenantId}/oid4vp/request/${requestId}/${values.session}`,
        };
        const queryString = Object.entries(params)
            .map(
                ([key, value]) =>
                    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
            )
            .join('&');

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
    async getResponse(body: AuthorizationResponse, tenantId: string) {
        const res = await this.encryptionService.decryptJwe<AuthResponse>(
            body.response,
        );
        if (!res.state) {
            throw new ConflictException('No state found in the response');
        }
        const session = await this.sessionService.get(res.state);

        // Create session logging context
        const logContext: SessionLogContext = {
            sessionId: res.state,
            tenantId,
            flowType: 'OID4VP',
            stage: 'response_processing',
        };

        this.sessionLogger.logFlowStart(logContext, {
            action: 'process_presentation_response',
            hasWebhook: !!session.webhook,
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
            await this.sessionService.add(res.state, tenantId, {
                //TODO: not clear why it has to be any
                credentials: credentials as any,
            });
            // if there a a webook URL, send the response there
            //TODO: move to dedicated service to reuse it also in the oid4vci flow.
            if (session.webhook) {
                await this.webhookService.sendWebhook(
                    session,
                    logContext,
                    credentials,
                );
            }

            this.sessionLogger.logFlowComplete(logContext, {
                credentialCount: credentials?.length || 0,
                webhookSent: !!session.webhook,
            });
        } catch (error) {
            this.sessionLogger.logFlowError(logContext, error as Error, {
                action: 'process_presentation_response',
            });
            throw error;
        }
    }
}
