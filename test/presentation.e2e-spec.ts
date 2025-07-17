import { beforeAll, describe, expect, test } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { Openid4vpClient } from '@openid4vc/openid4vp';
import { callbacks } from './utils';
import { readFileSync } from 'fs';

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

        app.useLogger(['error', 'warn', 'log']);
        // Uncomment the next line to enable logger middleware
        //app.use(loggerMiddleware);
        const configService = app.get(ConfigService);
        configService.set('PUBLIC_URL', 'https://example.com'); // Set a test URL
        host = configService.getOrThrow('PUBLIC_URL');
        clientId = configService.getOrThrow<string>('AUTH_CLIENT_ID');
        clientSecret = configService.getOrThrow<string>('AUTH_CLIENT_SECRET');
        await app.init();

        // Get JWT token using client credentials
        const tokenResponse = await request(app.getHttpServer())
            .post('/auth/token')
            .trustLocalhost()
            .send({
                client_id: clientId,
                client_secret: clientSecret,
            });

        authToken = tokenResponse.body.access_token;
        expect(authToken).toBeDefined();

        //import the pid credential configuration
        const pidCredentialConfiguration = JSON.parse(
            readFileSync('test/pid-presentation.json', 'utf-8'),
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
                fetch: async (uri: string) => {
                    const path = uri.split(host)[1];
                    const response = await request(app.getHttpServer())
                        .get(path)
                        .trustLocalhost();
                    return {
                        ok: true,
                        text: () => response.text,
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
    });
});
