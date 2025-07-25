import { beforeAll, describe, expect, test } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import {
    Openid4vpAuthorizationRequest,
    Openid4vpClient,
} from '@openid4vc/openid4vp';
import { callbacks } from './utils';
import { readFileSync } from 'fs';
import { SDJwtVcInstance } from '@sd-jwt/sd-jwt-vc';
import { digest } from '@sd-jwt/crypto-nodejs';
import { kbPayload, Signer } from '@sd-jwt/types';
import { KeyLike, sign } from 'node:crypto';
import { importJWK, CryptoKey, EncryptJWT, JWK } from 'jose';

async function preparePresentation(kb: Omit<kbPayload, 'sd_hash'>) {
    const credential = {
        credential:
            'eyJ0eXAiOiJkYytzZC1qd3QiLCJ4NWMiOlsiTUlJQmdqQ0NBU21nQXdJQkFnSVVZSWlJc25DRktieGFxeE0rcTF6VUZkYUtpRkl3Q2dZSUtvWkl6ajBFQXdJd0VqRVFNQTRHQTFVRUF3d0hSVlZFU1ZCTVR6QWVGdzB5TlRBM01qRXhOREkzTXpGYUZ3MHlOakEzTWpFeE5ESTNNekZhTUJJeEVEQU9CZ05WQkFNTUIwVlZSRWxRVEU4d1dUQVRCZ2NxaGtqT1BRSUJCZ2dxaGtqT1BRTUJCd05DQUFScVozdWVZRVFnYkZhOGw5MXQ3ZzYxZzR2SloxQ09RUWdtaVRsb0NwVGhSaitKMk9YMGtiOHJveUhBTlB6VXNxUk5Ma1Y1VktyQnhyMU1LYUhIMzRkQm8xMHdXekFaQmdOVkhSRUVFakFRZ2c0eE1qY3VNQzR3TGpFNk16QXdNREFkQmdOVkhRNEVGZ1FVRDVsRXBIbHpGK2dzNjZsZjYwR1VtN0lzelBBd0h3WURWUjBqQkJnd0ZvQVV2azZoNmx5eldkbXVEUmpPc3FtN0tjU05kSTh3Q2dZSUtvWkl6ajBFQXdJRFJ3QXdSQUlnZE93SFlqbkhZQ2tUejZwVkdjOVlEbDExbTZmeEJPcHptRlF3RU5xZDNvb0NJRElLUzVkN2lteFZsUGlUellCVmlMVVVqUnNSVWdWRE5JVHBvYU5yL0J2dCJdLCJhbGciOiJFUzI1NiJ9.eyJpc3MiOiJodHRwczovLzEyNy4wLjAuMTozMDAwIiwiaWF0IjoxNzUzNDU1OTM4LCJ2Y3QiOiJodHRwczovLzEyNy4wLjAuMTozMDAwL3Jvb3QvY3JlZGVudGlhbHMvdmN0L3BpZCIsImNuZiI6eyJqd2siOnsia3R5IjoiRUMiLCJjcnYiOiJQLTI1NiIsIngiOiI3LTBwWHdwNkFhMm9ud0xMQ0RJdy11WHVLa2xPRGFvUUZnQ1ZVTEVFYXVvIiwieSI6Im5SQ2V1bTFBMi1qS1BvWFllRzdIMFFFU0IwNzlJdGdtLWpNam5sMUZVdzgifX0sInN0YXR1cyI6eyJzdGF0dXNfbGlzdCI6eyJpZHgiOjM3MDcsInVyaSI6Imh0dHBzOi8xMjcuMC4wLjE6MzAwMC9yb290L3N0YXR1cy1tYW5hZ2VtZW50L3N0YXR1cy1saXN0In19LCJfc2QiOlsiMG5iUlphcW5KX1plVHBieXl1NHBXcUhxaF91b04xaHhPM3ZmVy1yVmV1YyIsIkE5cVdhbk9aX19rZThXVlVkb0xnaFNQOEZYSVRvWnp2QktwWWNReDk5T0EiLCJCRHdJbmdzV3lBSEkzMkdENVlaU2RXYlRGcnFlMGpOdmRfSnZTSmFnazI4IiwiQm9vOE82cmtpVjRxRVNsa0NlMmZvUlF4bmltSUQxNFcxa1plSW1vTTI2MCIsIkV1VUk0UEZSbWJHX3hjQ3VRbk5TQXh6QVN4dDg5TUtYSGpsY2tuNzlpa1kiLCJGZFFSWFBHaXEtaWJkZ2N2aXNhTlRPY2djV2V4dDd1Q3VXN2VMbXUxSmFVIiwiSjAwU1dnbDg5Q1JtNnZoWVRENUZVM2RYWHlhYU9MNmtaaHozbElCLWtzcyIsIlMxbEg4YjNrdFhRNnVkcDRmWkhJNTJRc3BMc0o3aHZmd3p0OUZLcmp0VUEiLCJpbXJsUUFzREZLUEI5T0h0bUFQbVphdzlhaFlzZTd0azhlNkQ1NjJmczlZIiwialhYdlJHWHh3MEIzRDFldC0tRzQzNVVfaXljVTFjdFl5eWxmekZmc3RYVSIsIm10S2o2Sm01dlAycFBjeC1KZEhCMFFiN19FcnVXeDIxNUtJVS1hRjNGZ0EiLCJ0aTFVanJhb0c2RW1aQlpwVTFOaGVrUk5iMXY0ajJwOXhBUDl4WGEtbXN3Il0sIl9zZF9hbGciOiJzaGEtMjU2In0.tFmoz8188cDefiYs5U3wdssB-jCNp8eHU7jV2lrChXWVVUWhLJ35xiAk1XY9Bgpm8ggP8tRO4aJIa8k3DfqcPw~WyI1NGQ0M2ZkN2VhNzAyZjUzIiwibG9jYWxpdHkiLCJLw5ZMTiJd~WyI1Y2Q3NWQ4NDM2MjdkNmNhIiwicG9zdGFsX2NvZGUiLCI1MTE0NyJd~WyJkYTZmOWRkM2U1YWRmZjM2Iiwic3RyZWV0X2FkZHJlc3MiLCJIRUlERVNUUkHhup5FIDE3Il0~WyI4YzA4Nzc5MjJmMzczYTllIiwiaXNzdWluZ19jb3VudHJ5IiwiREUiXQ~WyI1ZDg5ZDY3MzAyMTkwNmE3IiwiaXNzdWluZ19hdXRob3JpdHkiLCJERSJd~WyIyNGM1MDA2ODM3YTcwNjM4IiwiZ2l2ZW5fbmFtZSIsIkVSSUtBIl0~WyIzZThiZTJkY2U2MTM1MThlIiwiZmFtaWx5X25hbWUiLCJNVVNURVJNQU5OIl0~WyI4NGUzNWMwYTkzODM5MjdmIiwiYmlydGhfZmFtaWx5X25hbWUiLCJHQUJMRVIiXQ~WyI3MmRlMjdkNjJhOTYzYTI0IiwiYmlydGhkYXRlIiwiMTk2NC0wOC0xMiJd~WyIyMGMzOTk5OGRjODhiMTQyIiwiYWdlX2JpcnRoX3llYXIiLDE5NjRd~WyJiMTk4MTBlYzhmNDgxN2Y2IiwiYWdlX2luX3llYXJzIiw1OV0~WyJlMTk0YmM3NGQyYTgxNDVjIiwiYWdlX2VxdWFsX29yX292ZXIiLHsiMTIiOnRydWUsIjE0Ijp0cnVlLCIxNiI6dHJ1ZSwiMTgiOnRydWUsIjIxIjp0cnVlLCI2NSI6ZmFsc2V9XQ~WyI5NDMxMmZkMDkyY2Q2ZTllIiwicGxhY2Vfb2ZfYmlydGgiLHsibG9jYWxpdHkiOiJCRVJMSU4ifV0~WyI5ZjNkZTc5MTczNWNlMzk5IiwiYWRkcmVzcyIseyJfc2QiOlsiQlBoTTRKa2hYaHJMR3J3aGw3Z3VSeHh4VTJwNmpMNlFXQktKVGFrdkJKOCIsIkQtd2xiY0VWbThrS0hWaUw5M0ZVVWc1M1dob0tGM0RsNE5RU3d0Q01ta2siLCJUdnNoNHE5WGh1MEo0Rms3c0RJRHdmUGlsbFl5Tm9QVmJQcU9maVl2YldJIl19XQ~WyI0NzA4MDNkMzkyMzczZjEwIiwibmF0aW9uYWxpdGllcyIsWyJERSJdXQ~',
        privateKey: {
            kty: 'EC',
            x: '7-0pXwp6Aa2onwLLCDIw-uXuKklODaoQFgCVULEEauo',
            y: 'nRCeum1A2-jKPoXYeG7H0QESB079Itgm-jMjnl1FUw8',
            crv: 'P-256',
            d: 'MMZNzcwc6NhFP29d22NPgF5-filojzsnGPT4mH4irxk',
        },
    };

    const privateKey = (await importJWK(
        credential.privateKey,
        'ES256',
    )) as CryptoKey;
    const signer: Signer = (data: string) => {
        const sig = sign(
            null,
            Buffer.from(data),
            privateKey as unknown as KeyLike,
        );
        return Buffer.from(sig).toString('base64url');
    };

    const sdjwt = new SDJwtVcInstance({
        hasher: digest,
        kbSigner: signer,
        kbSignAlg: 'ES256',
    });
    const presentation = await sdjwt.present(
        credential.credential,
        {},
        {
            kb: {
                payload: kb,
            },
        },
    );
    return presentation;
}

describe('Presentation', () => {
    let app: INestApplication<App>;
    let authToken: string;
    let host: string;
    let clientId: string;
    let clientSecret: string;
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        const configService = app.get(ConfigService);
        configService.set('PUBLIC_URL', 'https://example.com'); // Set a test URL
        host = configService.getOrThrow('PUBLIC_URL');
        clientId = configService.getOrThrow<string>('AUTH_CLIENT_ID');
        clientSecret = configService.getOrThrow<string>('AUTH_CLIENT_SECRET');
        app.useGlobalPipes(new ValidationPipe());

        await app.init();

        // Get JWT token using client credentials
        const tokenResponse = await request(app.getHttpServer())
            .post('/auth/oauth2/token')
            .trustLocalhost()
            .send({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
            });

        authToken = tokenResponse.body.access_token;
        expect(authToken).toBeDefined();

        //import the pid credential configuration
        const pidCredentialConfiguration = JSON.parse(
            readFileSync('test/import/presentation/pid.json', 'utf-8'),
        );
        pidCredentialConfiguration.id = 'pid';
        await request(app.getHttpServer())
            .post('/presentation-management')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send(pidCredentialConfiguration);
    });

    test('create oid4vp offer', async () => {
        const res = await request(app.getHttpServer())
            .post('/presentation-management/request')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                requestId: 'pid',
            });

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

    test('ask for an invalid oid4vp offer', async () => {
        await request(app.getHttpServer())
            .post('/presentation-management/request')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                requestId: 'invalid',
            })
            .expect(409)
            .expect((res) => {
                expect(res.body.message).toContain(
                    'Request ID invalid not found',
                );
            });
    });

    test('present credential', async () => {
        const res = await request(app.getHttpServer())
            .post('/presentation-management/request')
            .trustLocalhost()
            .set('Authorization', `Bearer ${authToken}`)
            .send({
                response_type: 'uri',
                requestId: 'pid',
            });

        const client = new Openid4vpClient({
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
        const authRequest = client.parseOpenid4vpAuthorizationRequest({
            authorizationRequest: res.body.uri,
        });

        const resolved = await client.resolveOpenId4vpAuthorizationRequest({
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

        const jwt = await new EncryptJWT({ vp_token })
            .setProtectedHeader({
                alg: 'ECDH-ES',
                enc: 'A128GCM',
            })
            .setIssuedAt()
            .setExpirationTime('2h') // Optional: set expiration
            .encrypt(key); // Use the public key for encryption

        const authorizationResponse =
            await client.createOpenid4vpAuthorizationResponse({
                authorizationRequestPayload: authRequest.params,
                authorizationResponsePayload: {
                    response: jwt,
                },
                ...callbacks,
            });

        const submitRes = await client.submitOpenid4vpAuthorizationResponse({
            authorizationResponsePayload:
                authorizationResponse.authorizationResponsePayload,
            authorizationRequestPayload:
                resolved.authorizationRequestPayload as Openid4vpAuthorizationRequest,
        });
        expect(submitRes).toBeDefined();
    });
});
