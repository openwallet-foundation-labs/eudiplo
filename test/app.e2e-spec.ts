import { beforeAll, describe, expect, test } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';

describe('Issuance', () => {
    let app: INestApplication<App>;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
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
