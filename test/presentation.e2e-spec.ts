import { beforeAll, describe, expect, test } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';
import { Openid4vpClient } from '@openid4vc/openid4vp';
import { callbacks } from './utils';

describe('Presentation', () => {
    let app: INestApplication<App>;
    let authApiKey: string;
    let host: string;
    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useLogger(['error', 'warn', 'log']);
        // Uncomment the next line to enable logger middleware
        //app.use(loggerMiddleware);
        const configService = app.get(ConfigService);
        authApiKey = configService.getOrThrow('AUTH_API_KEY');
        configService.set('PUBLIC_URL', 'https://example.com'); // Set a test URL
        host = configService.getOrThrow('PUBLIC_URL');
        await app.init();
    });

    test('create oid4vp offer', async () => {
        const res = await request(app.getHttpServer())
            .post('/oid4vp')
            .trustLocalhost()
            .set('x-api-key', authApiKey)
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
            .set('x-api-key', authApiKey)
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBe(session);
            });
    });

    test('ask for an invalid oid4vp offer', async () => {
        await request(app.getHttpServer())
            .post('/oid4vp')
            .trustLocalhost()
            .set('x-api-key', authApiKey)
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
            .post('/oid4vp')
            .trustLocalhost()
            .set('x-api-key', authApiKey)
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
