import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import {
    clientAuthenticationAnonymous,
    Jwk,
    JwtSignerJwk,
} from '@openid4vc/oauth2';
import {
    AuthorizationFlow,
    extractScopesForCredentialConfigurationIds,
    Openid4vciClient,
} from '@openid4vc/openid4vci';
import {
    Openid4vpAuthorizationRequest,
    Openid4vpClient,
} from '@openid4vc/openid4vp';
import { digest } from '@sd-jwt/crypto-nodejs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { readFileSync } from 'fs';
import {
    EncryptJWT,
    exportJWK,
    generateKeyPair,
    importJWK,
    importX509,
    JWK,
    jwtVerify,
} from 'jose';
import request from 'supertest';
import { App } from 'supertest/types';
import { Agent, fetch, setGlobalDispatcher } from 'undici';
import { v4 } from 'uuid';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { AppModule } from '../src/app.module';
import { callbacks, getSignJwtCallback, preparePresentation } from './utils';

setGlobalDispatcher(
    new Agent({
        connect: {
            rejectUnauthorized: false,
        },
    }),
);
describe('Issuance', () => {
    let app: INestApplication<App>;
    let authToken: string;
    let clientId: string;
    let clientSecret: string;
    let host: string;

    const sdjwt = new SDJwtVcInstance({
        hasher: digest,
        hashAlg: 'sha-256',
    });

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());

        const configService = app.get(ConfigService);
        configService.set('CONFIG_IMPORT_FORCE', true);
        clientId = configService.getOrThrow<string>('AUTH_CLIENT_ID');
        clientSecret = configService.getOrThrow<string>('AUTH_CLIENT_SECRET');
        host = configService.getOrThrow<string>('PUBLIC_URL');

        await app.init();
        await app.listen(3000);

        // Get JWT token using client credentials
        const tokenResponse = await request(app.getHttpServer())
            .post('/oauth2/token')
            .trustLocalhost()
            .send({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
            })
            .expect(201);

        authToken = tokenResponse.body.access_token;
        expect(authToken).toBeDefined();

        //import key

        const privateKey = {
            kty: 'EC',
            x: 'pmn8SKQKZ0t2zFlrUXzJaJwwQ0WnQxcSYoS_D6ZSGho',
            y: 'rMd9JTAovcOI_OvOXWCWZ1yVZieVYK2UgvB2IPuSk2o',
            crv: 'P-256',
            d: 'rqv47L1jWkbFAGMCK8TORQ1FknBUYGY6OLU1dYHNDqU',
            kid: '039af178-3ca0-48f4-a2e4-7b1209f30376',
            alg: 'ES256',
        };

        await request(app.getHttpServer())
            .post('/key')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                privateKey,
            })
            .expect(201);

        //import the pid credential configuration
        const pidCredentialConfiguration = JSON.parse(
            readFileSync(
                'assets/config/root/issuance/credentials/pid.json',
                'utf-8',
            ),
        );
        pidCredentialConfiguration.id = 'pid';
        await request(app.getHttpServer())
            .post('/issuer-management/credentials')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send(pidCredentialConfiguration)
            .expect(201);

        //import the pid credential configuration for pre authorized code flow
        const pidNoneIssuanceConfiguration = JSON.parse(
            readFileSync(
                'assets/config/root/issuance/issuance/pid-none.json',
                'utf-8',
            ),
        );
        pidNoneIssuanceConfiguration.id = 'pid-none';
        await request(app.getHttpServer())
            .post('/issuer-management/issuance')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send(pidNoneIssuanceConfiguration)
            .expect(201);

        //import the pid credential configuration for authorized code flow
        const pidIssuanceConfiguration = JSON.parse(
            readFileSync(
                'assets/config/root/issuance/issuance/pid.json',
                'utf-8',
            ),
        );
        pidIssuanceConfiguration.id = 'pid';
        await request(app.getHttpServer())
            .post('/issuer-management/issuance')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send(pidIssuanceConfiguration)
            .expect(201);

        //import citizen that that requires presentation during issuance

        const citizenPresentationConfiguration = JSON.parse(
            readFileSync('assets/config/root/presentation/pid.json', 'utf-8'),
        );
        citizenPresentationConfiguration.id = 'pid';
        await request(app.getHttpServer())
            .post('/presentation-management')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send(citizenPresentationConfiguration)
            .expect(201);

        //import the citizen credential configuration
        const citizenCredentialConfiguration = JSON.parse(
            readFileSync(
                'assets/config/root/issuance/credentials/citizen.json',
                'utf-8',
            ),
        );
        citizenCredentialConfiguration.id = 'citizen';
        await request(app.getHttpServer())
            .post('/issuer-management/credentials')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send(citizenCredentialConfiguration)
            .expect(201);

        const citizenIssuanceConfiguration = JSON.parse(
            readFileSync(
                'assets/config/root/issuance/issuance/citizen.json',
                'utf-8',
            ),
        );
        citizenIssuanceConfiguration.id = 'citizen';
        await request(app.getHttpServer())
            .post('/issuer-management/issuance')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send(citizenIssuanceConfiguration)
            .expect(201);
        await request(app.getHttpServer())
            .get('/issuer-management/issuance')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200);
    });

    afterAll(async () => {
        await app.close();
    });

    test('get issuer metadata', async () => {
        const offerResponse = await request(app.getHttpServer())
            .post('/issuer-management/offer')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                issuanceId: 'pid',
            })
            .expect(201);

        const sessionId = offerResponse.body.session;

        const res = await request(app.getHttpServer())
            .get(`/${sessionId}/.well-known/openid-credential-issuer`)
            .trustLocalhost()
            .set('Accept', 'application/json')
            .expect(200);
        expect(res.body).toBeDefined();
        expect(res.body.credential_issuer).toBeDefined();
        expect(res.body.credential_issuer).toBe(
            `http://localhost:3000/${sessionId}`,
        );
    });

    test('get signed issuer metadata', async () => {
        const offerResponse = await request(app.getHttpServer())
            .post('/issuer-management/offer')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                issuanceId: 'pid',
            })
            .expect(201);

        const sessionId = offerResponse.body.session;

        const res = await request(app.getHttpServer())
            .get(`/${sessionId}/.well-known/openid-credential-issuer`)
            .trustLocalhost()
            .set('Accept', 'application/jwt')
            .expect(200);
        expect(res.body).toBeDefined();
        //get the x5c header and verify the signature
        const jwtHeader = JSON.parse(
            Buffer.from(res.text.split('.')[0], 'base64').toString('utf-8'),
        );
        expect(jwtHeader.typ).toBe('openidvci-issuer-metadata+jwt');
        expect(jwtHeader.alg).toBeDefined();
        expect(jwtHeader.x5c).toBeDefined();
        expect(jwtHeader.x5c.length).toBeGreaterThan(0);
        //verify the signature
        const cert = `-----BEGIN CERTIFICATE-----\n${jwtHeader.x5c[0]}\n-----END CERTIFICATE-----`;
        const key = await importX509(cert, 'ES256');
        //use jose to verify the signature
        const { payload } = await jwtVerify(res.text, key, {
            algorithms: [jwtHeader.alg],
        }).catch((err) => {
            console.error('JWT verification failed:', err);
            throw err;
        });
        expect(payload.iss).toBeDefined();
    });

    test('create oid4vci offer', async () => {
        const res = await request(app.getHttpServer())
            .post('/issuer-management/offer')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                issuanceId: 'pid',
            })
            .expect(201);

        expect(res.body).toBeDefined();
        const session = res.body.session;

        //check if the session exists
        await request(app.getHttpServer())
            .get(`/session/${session}`)
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBe(session);
            });
    });

    test('create oid4vci offier with defined session', async () => {
        const sessionId = v4();
        const res = await request(app.getHttpServer())
            .post('/issuer-management/offer')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                issuanceId: 'pid',
                session: sessionId,
            })
            .expect(201);

        expect(res.body).toBeDefined();
        const session = res.body.session;
        expect(session).toBe(sessionId);
    });

    test('ask for an invalid oid4vci offer', async () => {
        await request(app.getHttpServer())
            .post('/issuer-management/offer')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                issuanceId: 'invalid',
            })
            .expect(400);
    });

    test('pre authorized code flow', async () => {
        const offerResponse = await request(app.getHttpServer())
            .post('/issuer-management/offer')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                issuanceId: 'pid-none',
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

        const dpopSigner = {
            method: 'jwk',
            alg: 'ES256',
            publicJwk: holderPublicKeyJwk,
        } as JwtSignerJwk;

        const { accessTokenResponse, dpop } =
            await client.retrievePreAuthorizedCodeAccessTokenFromOffer({
                credentialOffer,
                issuerMetadata,
                dpop: {
                    nonce: 'random-nonce',
                    signer: dpopSigner,
                },
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
            .set('Authorization', `Bearer ${authToken}`);
        const notificationObj = session.body.notifications.find(
            (notification) =>
                notification.id ===
                credentialResponse.credentialResponse.notification_id,
        );
        expect(notificationObj).toBeDefined();
        expect(notificationObj.event).toBe('credential_accepted');
    });

    test('authorized code flow', async () => {
        const sessionId = 'fd3ebf28-8ad6-4909-8a7a-a739c2c412c0';
        const offerResponse = await request(app.getHttpServer())
            .post('/issuer-management/offer')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                issuanceId: 'pid',
                session: sessionId,
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

        const dpopSigner = {
            method: 'jwk',
            alg: 'ES256',
            publicJwk: holderPublicKeyJwk,
        } as JwtSignerJwk;

        const clientId = 'wallet';
        const redirectUri = 'http://127.0.0.1:3000/callback';
        //TODO: no real use for this yet, need to check: https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-authorization-endpoint
        const pkceCodeVerifier = 'random-code-verifier';

        const authorization = await client.initiateAuthorization({
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

        expect(authorization.authorizationFlow).toBe(
            AuthorizationFlow.Oauth2Redirect,
        );

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

        const credential: string = credentialResponse.credentialResponse
            .credentials?.[0] as string;
        expect(credential).toBeDefined();

        const claims: any = await sdjwt.getClaims(credential);

        // exp need to be defined
        expect(claims.exp).toBeDefined();
        // lifetime should be 1 hour
        expect(claims.exp - claims.iat).toBe(3600);
        // status should be defined
        expect(claims.status).toBeDefined();
        //check that a key is present in the cnf
        expect(claims.cnf).toBeDefined();

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
            .set('Authorization', `Bearer ${authToken}`);
        const notificationObj = session.body.notifications.find(
            (notification) =>
                notification.id ===
                credentialResponse.credentialResponse.notification_id,
        );
        expect(notificationObj).toBeDefined();
        expect(notificationObj.event).toBe('credential_accepted');
    });

    test('presentation during issuance', async () => {
        const offerResponse = await request(app.getHttpServer())
            .post('/issuer-management/offer')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                issuanceId: 'citizen',
            })
            .expect(201);

        const holderKeyPair = await generateKeyPair('ES256', {
            extractable: true,
        });
        const holderPrivateKeyJwk = await exportJWK(holderKeyPair.privateKey);
        //const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);

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
        const redirectUri = 'http://127.0.0.1:80/callback';
        //TODO: no real use for this yet, need to check: https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-authorization-endpoint
        const pkceCodeVerifier = 'random-code-verifier';

        const authorization = await client.initiateAuthorization({
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

        expect(authorization.authorizationFlow).toBe(
            AuthorizationFlow.PresentationDuringIssuance,
        );

        const vpClient = new Openid4vpClient({
            callbacks: {
                ...callbacks,
                fetch: async (uri: string, init: RequestInit) => {
                    const path = uri.split(host)[1];
                    let response: any;
                    if (init.method === 'POST') {
                        response = await request(app.getHttpServer())
                            .post(path)
                            .trustLocalhost()
                            .send(init.body!);
                    } else {
                        response = await request(app.getHttpServer())
                            .get(path)
                            .trustLocalhost();
                    }
                    return {
                        ok: true,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        text: () => response.text,
                        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
                        json: () => response.body,
                        status: response.status,
                        headers: response.headers,
                    };
                },
            },
        });
        const authRequest = vpClient.parseOpenid4vpAuthorizationRequest({
            authorizationRequest: authorization.openid4vpRequestUrl,
        });

        const resolved = await vpClient.resolveOpenId4vpAuthorizationRequest({
            authorizationRequestPayload: authRequest.params,
        });
        expect(resolved).toBeDefined();

        const vp_token = await preparePresentation({
            iat: Math.floor(Date.now() / 1000),
            aud: resolved.authorizationRequestPayload.aud as string,
            nonce: resolved.authorizationRequestPayload.nonce,
        });

        //encrypt the vp token
        const key = (await importJWK(
            resolved.authorizationRequestPayload.client_metadata?.jwks
                ?.keys[0] as JWK,
            'ECDH-ES',
        )) as CryptoKey;

        const jwt = await new EncryptJWT({
            vp_token: { pid: vp_token },
            state: resolved.authorizationRequestPayload.state!,
        })
            .setProtectedHeader({
                alg: 'ECDH-ES',
                enc: 'A128GCM',
            })
            .setIssuedAt()
            .setExpirationTime('2h') // Optional: set expiration
            .encrypt(key); // Use the public key for encryption

        const authorizationResponse =
            await vpClient.createOpenid4vpAuthorizationResponse({
                authorizationRequestPayload: authRequest.params,
                authorizationResponsePayload: {
                    response: jwt,
                },
                ...callbacks,
            });

        const submitRes = await vpClient.submitOpenid4vpAuthorizationResponse({
            authorizationResponsePayload:
                authorizationResponse.authorizationResponsePayload,
            authorizationRequestPayload:
                resolved.authorizationRequestPayload as Openid4vpAuthorizationRequest,
        });
        expect(submitRes).toBeDefined();

        const { authorizationChallengeResponse } =
            await client.retrieveAuthorizationCodeUsingPresentation({
                issuerMetadata,
                authSession: (authorization as any).authSession!,
                credentialOffer,
                // out of scope for now, handled by RP
                presentationDuringIssuanceSession: 'some-session',
            });

        const holderPublicKeyJwk = await exportJWK(holderKeyPair.publicKey);

        const dpopSigner = {
            method: 'jwk',
            alg: 'ES256',
            publicJwk: holderPublicKeyJwk,
        } as JwtSignerJwk;

        const { accessTokenResponse, dpop } =
            await client.retrieveAuthorizationCodeAccessTokenFromOffer({
                issuerMetadata,
                authorizationCode:
                    authorizationChallengeResponse.authorization_code,
                credentialOffer,
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

        expect(
            credentialResponse.credentialResponse.credentials?.[0],
        ).toBeDefined();

        const claims: any = await sdjwt.getClaims(
            credentialResponse.credentialResponse.credentials![0] as string,
        );

        // status list should not be present
        expect(claims.status).toBeUndefined();
        // exp should not be present
        expect(claims.exp).toBeUndefined();
        // key binding should not be present
        expect(claims.cnf).toBeUndefined();

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
            .set('Authorization', `Bearer ${authToken}`);
        const notificationObj = session.body.notifications.find(
            (notification) =>
                notification.id ===
                credentialResponse.credentialResponse.notification_id,
        );
        expect(notificationObj).toBeDefined();
        expect(notificationObj.event).toBe('credential_accepted');
    });
});
