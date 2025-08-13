import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { beforeAll, describe, expect, test } from 'vitest';
import { AppModule } from '../src/app.module';

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

    test('GET / returns EUDIPLO', () => {
        return request(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect('Content-Type', /text\/html/)
            .expect((res) => {
                expect(res.text).toContain('EUDIPLO');
            });
    });
});
