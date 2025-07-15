import { beforeAll, describe, expect, test } from 'vitest';
import {
    extractScopesForCredentialConfigurationIds,
    Openid4vciClient,
} from '@openid4vc/openid4vci';
import { callbacks, getSignJwtCallback } from './utils';
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
import { readFileSync } from 'fs';
import { fetch, setGlobalDispatcher, Agent } from 'undici';

setGlobalDispatcher(
    new Agent({
        connect: {
            rejectUnauthorized: false,
        },
    }),
);
describe('Issuance', () => {
    let app: INestApplication<App>;
    let authApiKey: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication({
            httpsOptions: {
                key: readFileSync('test/cert/key.pem'),
                cert: readFileSync('test/cert/cert.pem'),
            },
        });

        app.useLogger(['error', 'warn', 'log']);
        // Uncomment the next line to enable logger middleware
        //app.use(loggerMiddleware);
        const configService = app.get(ConfigService);
        authApiKey = configService.getOrThrow('AUTH_API_KEY');
        await app.init();
        await app.listen(3000);
    });

    test('create oid4vci offer', async () => {
        const res = await request(app.getHttpServer())
            .post('/vci/offer')
            .trustLocalhost()
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
            .trustLocalhost()
            .set('x-api-key', authApiKey)
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBe(session);
            });
    });

    test('ask for an invalid oid4vci offer', async () => {
        await request(app.getHttpServer())
            .post('/vci/offer')
            .trustLocalhost()
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
            .trustLocalhost()
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

        const clientId = 'wallet';
        const redirectUri = 'https://127.0.0.1:3000/callback';
        //TODO: no real use for this yet, need to check: https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-authorization-endpoint
        const pkceCodeVerifier = 'random-code-verifier';

        const { authorizationRequestUrl, pkce } =
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

        //get the authorization code, in this setup it will return a redirect with the URL
        const result = await fetch(authorizationRequestUrl);
        const authorizationCode = new URL(result.url).searchParams.get('code')!;

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
                pkceCodeVerifier: pkce?.codeVerifier,
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
        await client.sendNotification({
            issuerMetadata,
            notification: {
                //from the credential response
                notificationId:
                    credentialResponse.credentialResponse.notification_id!,
                event: 'credential_accepted',
            },
            accessToken: accessTokenResponse.access_token,
            dpop: {
                ...dpop,
                signer: dpopSigner,
            },
        });
        const session = await request(app.getHttpServer())
            .get(`/session/${offerResponse.body.session}`)
            .trustLocalhost()
            .set('x-api-key', authApiKey);
        const notificationObj = session.body.notifications.find(
            (notification) =>
                notification.id ===
                credentialResponse.credentialResponse.notification_id,
        );
        expect(notificationObj).toBeDefined();
        expect(notificationObj.event).toBe('credential_accepted');
    });
});
