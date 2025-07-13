import { beforeAll, describe, expect, test } from 'vitest';
import { Openid4vciClient } from '@openid4vc/openid4vci';
import { callbacks, getSignJwtCallback } from './utils';
import { exportJWK, generateKeyPair } from 'jose';
import { Jwk, clientAuthenticationAnonymous } from '@openid4vc/oauth2';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { INestApplication } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';

describe('EUDIPLO E2E Tests', () => {
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

    test('create oid4vci offer', async () => {
        const res = await request(app.getHttpServer())
            .post('/vci/offer')
            .set('x-api-key', '1234')
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
            .set('x-api-key', '1234')
            .expect(200)
            .expect((res) => {
                expect(res.body.id).toBe(session);
            });
    });

    test('ask for an invalid oid4vci offer', async () => {
        await request(app.getHttpServer())
            .post('/vci/offer')
            .set('x-api-key', '1234')
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
            .set('x-api-key', '1234')
            .send({
                response_type: 'uri',
                credentialConfigurationIds: ['pid'],
            })
            .expect(201);

        const offer = offerResponse.body.uri;

        const holderPrivateKeyJwk = await generateKeyPair('ES256', {
            extractable: true,
        }).then((keyPair) => exportJWK(keyPair.privateKey));

        const client = new Openid4vciClient({
            callbacks: {
                ...callbacks,
                fetch,
                clientAuthentication: clientAuthenticationAnonymous(),
                signJwt: getSignJwtCallback([holderPrivateKeyJwk as Jwk]),
            },
        });
        const resolvedOffer = await client.resolveCredentialOffer(offer);

        console.log(resolvedOffer);
    });
});
