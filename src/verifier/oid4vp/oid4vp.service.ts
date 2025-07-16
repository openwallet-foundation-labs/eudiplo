import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { CryptoService } from '../../crypto/crypto.service';
import { AuthorizationResponse } from './dto/authorization-response.dto';
import { RegistrarService } from '../../registrar/registrar.service';
import {
    AuthResponse,
    PresentationsService,
} from '../presentations/presentations.service';
import { EncryptionService } from '../../crypto/encryption/encryption.service';
import { v4 } from 'uuid';
import { SessionService } from '../../session/session.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { OfferResponse } from '../../issuer/oid4vci/dto/offer-request.dto';
import { WebhookConfig } from '../../utils/webhook.dto';

export interface PresentationRequestOptions {
    session?: string;
    webhook?: WebhookConfig;
}

@Injectable()
export class Oid4vpService {
    constructor(
        private cryptoService: CryptoService,
        private encryptionService: EncryptionService,
        private configService: ConfigService,
        private registrarService: RegistrarService,
        private presentationsService: PresentationsService,
        private sessionService: SessionService,
        private httpService: HttpService,
    ) {}

    async createAuthorizationRequest(
        requestId: string,
        auth_session?: string,
    ): Promise<string> {
        const host = this.configService
            .getOrThrow<string>('PUBLIC_URL')
            .replace('https://', '');
        const values =
            await this.presentationsService.getPresentationRequest(requestId);
        let regCert: string | undefined = undefined;
        if (this.registrarService.isEnabled()) {
            regCert = await this.registrarService.addRegistrationCertificate(
                values.registrationCert,
                values.dcql_query,
                requestId,
            );
        }
        if (!auth_session) {
            auth_session = v4();
            await this.sessionService.create({ id: auth_session });
        }
        const nonce = randomUUID();
        await this.sessionService.add(auth_session, { vp_nonce: nonce });

        const request = {
            payload: {
                response_type: 'vp_token',
                client_id: 'x509_san_dns:' + host,
                response_uri: 'https://' + host + '/oid4vp/response',
                response_mode: 'direct_post.jwt',
                nonce,
                dcql_query: values.dcql_query,
                client_metadata: {
                    jwks: {
                        keys: [this.encryptionService.getEncryptionPublicKey()],
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
                aud: 'https://' + host,
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
            accessCert = this.cryptoService.getCertChain('access');
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (err: any) {
            accessCert = this.cryptoService.getCertChain('signing');
        }

        const header = {
            ...request.header,
            alg: 'ES256',
            x5c: accessCert,
        };

        return this.cryptoService.signJwt(header, request.payload);
    }

    async createRequest(
        requestId: string,
        values: PresentationRequestOptions,
    ): Promise<OfferResponse> {
        const vpRequest =
            await this.presentationsService.getPresentationRequest(requestId);

        if (!values.session) {
            values.session = v4();
            await this.sessionService.create({
                id: values.session,
                webhook: values.webhook ?? vpRequest.webhook,
            });
        } else {
            await this.sessionService.add(values.session, {
                webhook: values.webhook ?? vpRequest.webhook,
            });
        }

        const host = this.configService
            .getOrThrow<string>('PUBLIC_URL')
            .replace('https://', '');
        const params = {
            client_id: `x509_san_dns:${host}`,
            request_uri: `${this.configService.getOrThrow<string>('PUBLIC_URL')}/oid4vp/request/${requestId}/${values.session}`,
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

    async getResponse(body: AuthorizationResponse) {
        const res = await this.encryptionService.decryptJwe<AuthResponse>(
            body.response,
        );
        const session = await this.sessionService.get(res.state);
        //TODO: load required fields from the config
        const credentials = await this.presentationsService.parseResponse(
            res,
            [],
            session.vp_nonce as string,
        );
        //tell the auth server the result of the session.
        await this.sessionService.add(res.state, {
            //TODO: not clear why it has to be any
            credentials: credentials as any,
        });

        // if there a a webook URL, send the response there
        if (session.webhook) {
            const headers: Record<string, string> = {};
            if (
                session.webhook.auhth &&
                session.webhook.auhth.type === 'apiKey'
            ) {
                headers[session.webhook.auhth.config.headerName] =
                    session.webhook.auhth.config.value;
            }
            await firstValueFrom(
                this.httpService.post(
                    session.webhook.url,
                    {
                        credentials,
                        session: res.state,
                    },
                    {
                        headers,
                    },
                ),
            ).then(
                async (webhookResponse) => {
                    //TODO: better: just store it when it's a presentation during issuance
                    if (webhookResponse.data) {
                        session.credentialPayload!.values =
                            webhookResponse.data;
                        //store received webhook response
                        await this.sessionService.add(res.state, {
                            credentialPayload: session.credentialPayload,
                        });
                    }
                },
                (err) => {
                    console.error('Error sending webhook:', err);
                    throw new Error(
                        `Error sending webhook: ${err.message || err}`,
                    );
                },
            );
        }
    }
}
