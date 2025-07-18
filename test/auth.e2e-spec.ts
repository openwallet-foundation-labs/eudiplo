import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { ConfigService } from '@nestjs/config';

describe('Authentication (e2e)', () => {
    let app: INestApplication;
    let clientId: string;
    let clientSecret: string;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        const configService = app.get(ConfigService);
        clientId = configService.getOrThrow<string>('AUTH_CLIENT_ID');
        clientSecret = configService.getOrThrow<string>('AUTH_CLIENT_SECRET');
    });

    afterAll(async () => {
        await app.close();
    });

    test('should get JWT token with valid client credentials', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/token')
            .send({
                client_id: clientId,
                client_secret: clientSecret,
            })
            .expect(201);

        expect(response.body).toHaveProperty('access_token');
        expect(response.body).toHaveProperty('token_type', 'Bearer');
        expect(response.body).toHaveProperty('expires_in', '24h');
        expect(typeof response.body.access_token).toBe('string');
    });

    test('should reject invalid client credentials', async () => {
        await request(app.getHttpServer())
            .post('/auth/token')
            .send({
                client_id: 'invalid-client',
                client_secret: 'invalid-secret',
            })
            .expect(401)
            .expect((res) => {
                expect(res.body.message).toBe('Invalid client credentials');
            });
    });

    test('should reject missing client credentials', async () => {
        await request(app.getHttpServer())
            .post('/auth/token')
            .send({
                client_id: clientId,
                // Missing client_secret
            })
            .expect(401);
    });

    test('should reject access without token', async () => {
        await request(app.getHttpServer())
            .get('/session') // Protected endpoint
            .expect(401);
    });

    test('should reject access with invalid token', async () => {
        await request(app.getHttpServer())
            .get('/session') // Protected endpoint
            .set('Authorization', 'Bearer invalid-token')
            .expect(401);
    });
});
