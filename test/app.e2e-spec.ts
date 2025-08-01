import { beforeAll, describe, expect, test } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';

describe('Home', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());

        await app.init();
    });

    test('GET / returns EUDIPLO', async () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect('Content-Type', /text\/html/)
            .expect((res) => {
                expect(res.text).toContain('EUDIPLO');
            });
    });
});
