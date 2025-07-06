import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'node:crypto';
import { CryptoService } from 'src/crypto/crypto.service';
import { AuthorizationResponse } from './dto/authorization-response.dto';
import { RegistrarService } from 'src/registrar/registrar.service';
import {
  AuthResponse,
  PresentationsService,
} from '../presentations/presentations.service';
import { EncryptionService } from 'src/crypto/encryption/encryption.service';
import { v4 } from 'uuid';
import { SessionService } from 'src/session/session.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface PresentationRequestOptions {
  session?: string;
  webhook?: string;
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
      .getOrThrow<string>('CREDENTIAL_ISSUER')
      .replace('https://', '');
    const values = this.presentationsService.getPresentationRequest(requestId);
    const regCert = await this.registrarService.addRegistrationCertificate(
      values.registrationCert,
      values.dcql_query,
      requestId,
    );
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
              'kb-jwt_alg_values': ['EdDSA', 'ES256', 'ES384', 'ES256K'],
              'sd-jwt_alg_values': ['EdDSA', 'ES256', 'ES384', 'ES256K'],
            },
          },
          authorization_encrypted_response_alg: 'ECDH-ES',
          authorization_encrypted_response_enc: 'A128GCM',
          client_name:
            this.configService.getOrThrow<string>('REGISTRAR_RP_NAME'),
          response_types_supported: ['vp_token'],
        },
        state: auth_session,
        aud: 'https://' + host,
        exp: Math.floor(Date.now() / 1000) + 60 * 5,
        iat: Math.floor(new Date().getTime() / 1000),
        verifier_attestations: [
          {
            format: 'jwt',
            data: regCert,
          },
        ],
      },
      header: {
        typ: 'oauth-authz-req+jwt',
      },
    };

    const header = {
      ...request.header,
      alg: 'ES256',
      x5c: this.cryptoService.getCertChain('access'),
    };

    return this.cryptoService.signJwt(header, request.payload);
  }

  async createRequest(
    requestId: string,
    values: PresentationRequestOptions,
  ): Promise<string> {
    const vpRequest =
      this.presentationsService.getPresentationRequest(requestId);

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
      .getOrThrow<string>('CREDENTIAL_ISSUER')
      .replace('https://', '');
    const params = {
      client_id: `x509_san_dns:${host}`,
      request_uri: `${this.configService.getOrThrow<string>('CREDENTIAL_ISSUER')}/oid4vp/request/${requestId}/${values.session}`,
    };
    const queryString = Object.entries(params)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(value)}`,
      )
      .join('&');

    return queryString;
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
      console.log('got webhook', session.webhook);
      console.log('send credentials to webhook', credentials);
      const webhookResponse = await firstValueFrom(
        this.httpService.post(session.webhook, {
          credentials: credentials.map((cred) => cred.payload),
        }),
      );
      session.credentialPayload!.values = webhookResponse.data;
      //store received webhook response
      await this.sessionService.add(res.state, {
        credentialPayload: session.credentialPayload,
      });
    }
  }
}
