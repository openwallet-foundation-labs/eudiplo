import { beforeAll, describe, expect, test } from 'vitest';
import {
    extractScopesForCredentialConfigurationIds,
    Openid4vciClient,
} from '@openid4vc/openid4vci';
import {
    callbacks,
    createSupertestFetch,
    getSignJwtCallback,
    loggerMiddleware,
} from './utils';
import { exportJWK, generateKeyPair } from 'jose';
import {
    Jwk,
    JwtSignerJwk,
    clientAuthenticationAnonymous,
} from '@openid4vc/oauth2';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';

describe('Issuance', () => {
    let app: INestApplication<App>;
    let authApiKey: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useLogger(['error', 'warn', 'log']);
        app.use(loggerMiddleware);
        const configService = app.get(ConfigService);
        authApiKey = configService.getOrThrow('AUTH_API_KEY');
        await app.init();
    });

    test('create oid4vci offer', async () => {
        const res = await request(app.getHttpServer())
            .post('/vci/offer')
            .set('x-api-key', authApiKey)
            .send({
                response_type: 'uri',
                credentialConfigurationIds: ['pid'],
            })
            .expect(201);

        expect(res.body).toBeDefined();
        const session = res.body.session;

        //check if the session exists
        await request(app.getHttpServer())
            .get(`/session/${session}`)
            .set('x-api-key', authApiKey)
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBe(session);
            });
    });

    test('ask for an invalid oid4vci offer', async () => {
        await request(app.getHttpServer())
            .post('/vci/offer')
            .set('x-api-key', authApiKey)
            .send({
                response_type: 'uri',
                credentialConfigurationIds: ['invalid'],
            })
            .expect(409)
            .expect((res) => {
                expect(res.body.message).toContain(
                    'Invalid credential configuration ID',
                );
            });
    });

    test('get credential from oid4vci offer', async () => {
        const offerResponse = await request(app.getHttpServer())
            .post('/vci/offer')
            .set('x-api-key', authApiKey)
            .send({
                response_type: 'uri',
                credentialConfigurationIds: ['pid'],
            })
            .expect(201);

        const holderKeyPair = await generateKeyPair('ES256', {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);
        const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);

        const client = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                fetch: createSupertestFetch(app.getHttpServer()),
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });
        const credentialOffer = await client.resolveCredentialOffer(
            offerResponse.body.uri,
        );

        const issuerMetadata = await client.resolveIssuerMetadata(
            credentialOffer.credential_issuer,
        );

        const clientId = 'random-client-id';
        const redirectUri = 'https://localhost:3000/callback';
        const pkceCodeVerifier = 'random-code-verifier';

        //get the auth server metadata
        const auth = await client.initiateAuthorization({
            clientId,
            credentialOffer,
            issuerMetadata,
        });

        const { authorizationRequestUrl, pkce, authorizationServer } =
            await client.createAuthorizationRequestUrlFromOffer({
                clientId,
                issuerMetadata,
                redirectUri,
                credentialOffer,
                pkceCodeVerifier,
                scope: extractScopesForCredentialConfigurationIds({
                    credentialConfigurationIds:
                        credentialOffer.credential_configuration_ids,
                    issuerMetadata,
                })?.join(' '),
            });

        const fetcher = createSupertestFetch(app.getHttpServer());
        const result = await fetcher(authorizationRequestUrl);
        const redirect = result.headers.get('location');
        const authorizationCode = new URL(redirect!).searchParams.get('code')!;

        const dpopSigner = {
            method: 'jwk',
            alg: 'ES256',
            publicJwk: holderPublicKeyJwk,
        } as JwtSignerJwk;

        const { accessTokenResponse, dpop } =
            await client.retrieveAuthorizationCodeAccessTokenFromOffer({
                issuerMetadata,
                authorizationCode,
                credentialOffer,
                //pkceCodeVerifier: pkce?.codeVerifier,
                dpop: {
                    nonce: 'random-nonce',
                    signer: dpopSigner,
                },
                redirectUri,
            });
        const { jwt: proofJwt } = await client.createCredentialRequestJwtProof({
            issuerMetadata,
            signer: {
                method: 'jwk',
                alg: 'ES256',
                publicJwk: holderPublicKeyJwk,
            } as JwtSignerJwk,
            clientId,
            issuedAt: new Date(),
            credentialConfigurationId:
                credentialOffer.credential_configuration_ids[0],
            nonce: accessTokenResponse.c_nonce,
        });

        const credentialResponse = await client.retrieveCredentials({
            accessToken: accessTokenResponse.access_token,
            credentialConfigurationId:
                credentialOffer.credential_configuration_ids[0],
            issuerMetadata,
            dpop: {
                ...dpop,
                signer: dpopSigner,
            },
            proof: {
                proof_type: 'jwt',
                jwt: proofJwt,
            },
        });
    });
});
