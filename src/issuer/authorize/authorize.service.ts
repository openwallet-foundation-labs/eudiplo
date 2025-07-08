import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  type AuthorizationCodeGrantIdentifier,
  type AuthorizationServerMetadata,
  type HttpMethod,
  Jwk,
  Oauth2AuthorizationServer,
  PkceCodeChallengeMethod,
} from '@openid4vc/oauth2';
import type { Request, Response } from 'express';
import { CryptoService } from '../../crypto/crypto.service';
import { getHeadersFromRequest } from '../oid4vci/util';
import { AuthorizeQueries } from './dto/authorize-request.dto';
import { Oid4vpService } from '../../verifier/oid4vp/oid4vp.service';
import { SessionService } from '../../session/session.service';
import { CredentialsService } from '../credentials/credentials.service';

export interface ParsedAccessTokenAuthorizationCodeRequestGrant {
  grantType: AuthorizationCodeGrantIdentifier;
  code: string;
}

@Injectable()
export class AuthorizeService {
  public authorizationServer: Oauth2AuthorizationServer;

  constructor(
    private configService: ConfigService,
    private cryptoService: CryptoService,
    private oid4vpService: Oid4vpService,
    private sessionService: SessionService,
    private credentialsService: CredentialsService,
  ) {
    this.authorizationServer = new Oauth2AuthorizationServer({
      callbacks: this.cryptoService.callbacks,
    });
  }

  authzMetadata(): AuthorizationServerMetadata {
    const authServer = this.configService.getOrThrow<string>('PUBLIC_URL');
    return this.authorizationServer.createAuthorizationServerMetadata({
      issuer: authServer,
      token_endpoint: `${authServer}/authorize/token`,
      authorization_endpoint: `${authServer}/authorize`,
      jwks_uri: `${authServer}/.well-known/jwks.json`,
      dpop_signing_alg_values_supported: ['ES256'],
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
            'request_uri not found or not provided in the request',
          );
        });
    } else {
      throw new ConflictException(
        'request_uri not found or not provided in the request',
      );
    }
    const code = await this.setAuthCode(values.issuer_state);
    res.redirect(`${values.redirect_uri}?code=${code}`);
  }

  async validateTokenRequest(body: any, req: Request) {
    const url = `${this.configService.getOrThrow<string>('PUBLIC_URL')}${req.url}`;

    const parsedAccessTokenRequest =
      this.authorizationServer.parseAccessTokenRequest({
        accessTokenRequest: body,
        request: {
          method: req.method as HttpMethod,
          url,
          headers: getHeadersFromRequest(req),
        },
      });

    const session = await this.sessionService.getBy({
      authorization_code: body.code,
    });

    if (!session) {
      throw new ConflictException('Authorization code not found');
    }

    const valid =
      await this.authorizationServer.verifyAuthorizationCodeAccessTokenRequest({
        grant:
          parsedAccessTokenRequest.grant as ParsedAccessTokenAuthorizationCodeRequestGrant,
        accessTokenRequest: parsedAccessTokenRequest.accessTokenRequest,
        expectedCode: session.authorization_code as string,
        request: {
          method: req.method as HttpMethod,
          url,
          headers: getHeadersFromRequest(req),
        },
        dpop: {
          required: true,
          allowedSigningAlgs:
            this.authzMetadata().dpop_signing_alg_values_supported,
          jwt: parsedAccessTokenRequest.dpopJwt,
        },
      });

    const cNonce = randomUUID();
    return this.authorizationServer.createAccessTokenResponse({
      audience: this.configService.getOrThrow<string>('PUBLIC_URL'),
      signer: {
        method: 'jwk',
        alg: 'ES256',
        publicJwk: (await this.cryptoService.keyService.getPublicKey(
          'jwk',
        )) as Jwk,
      },
      subject: session.id,
      expiresInSeconds: 300,
      authorizationServer: this.authzMetadata().issuer,
      cNonce,
      cNonceExpiresIn: 100,
      clientId: 'wallet', // must be same as the client attestation
      dpopJwk: valid.dpopJwk,
      additionalAccessTokenPayload: {
        nonce: cNonce,
      },
    });
  }

  async parseChallengeRequest(body: AuthorizeQueries, webhook?: string) {
    console.log(body);
    // re using the issuer state as auth session
    const auth_session = body.issuer_state;
    const presentation = `openid4vp://?${await this.oid4vpService.createRequest('pid', { session: auth_session, webhook })}`;
    const res = {
      error: 'insufficient_authorization',
      auth_session,
      presentation,
      error_description: 'Presentation of credential required before issuance',
    };
    return res;
  }

  async authorizationChallengeEndpoint(
    res: Response<any, Record<string, any>>,
    body: AuthorizeQueries,
  ) {
    // auth session and issuer state have the same value
    if (body.auth_session) {
      const session = await this.sessionService.get(body.auth_session);
      // if session is not found, we assume that the auth session is the
      if (!session) {
        throw new ConflictException(
          'auth_session not found or not provided in the request',
        );
      }
      //check if session has valid presentation, we assume for now
      await this.sendAuthorizationCode(res, body.auth_session);
      return;
    }

    const session = await this.sessionService.get(body.issuer_state);
    if (!session) {
      throw new Error('Credential offer not found');
    }
    const ids = session.offer!.credential_configuration_ids;
    const config = this.credentialsService.getConfigById(ids[0]);
    if (config.presentation_during_issuance) {
      const webhook = config.presentation_during_issuance.webhook;
      const response = await this.parseChallengeRequest(body, webhook);
      res.status(400).send(response);
    } else {
      await this.sendAuthorizationCode(res, body.issuer_state);
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
    await this.sessionService.add(issuer_state, { authorization_code: code });
    return code;
  }
}
