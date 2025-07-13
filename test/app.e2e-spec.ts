import { existsSync, mkdirSync, rmSync, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { GenericContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, expect, test } from 'vitest';
import axios, { AxiosInstance } from 'axios';
import { join } from 'path';
import { Openid4vciClient } from '@openid4vc/openid4vci';
import { callbacks, getSignJwtCallback } from './utils';
import { exportJWK, generateKeyPair } from 'jose';
import { Jwk, clientAuthenticationAnonymous } from '@openid4vc/oauth2';

let container: Awaited<ReturnType<typeof startContainer>>;

export const AUTH_API_KEY = '1234';
let PUBLIC_URL = 'https://localhost:3000';

let axiosInstance: AxiosInstance;

/**
 * Writes the logs to a file
 * @param fileName
 * @param stream
 */
export function saveLogs(fileName: string, stream: Readable) {
    const logFolder = './logs';
    if (!existsSync(logFolder)) {
        mkdirSync(logFolder, { recursive: true });
    }
    const filePath = `${logFolder}/${fileName}.log`;
    if (existsSync(filePath)) {
        rmSync(filePath);
    }
    const writeStream = createWriteStream(filePath, {
        flags: 'a',
    });
    stream.pipe(writeStream);
}

/**
 * Pipes a readable stream directly to stdout
 * @param stream
 */
export function pipeToConsole(stream: Readable) {
    stream.pipe(process.stdout);
}

async function startContainer() {
    return await new GenericContainer('ghcr.io/cre8/eudiplo:latest')
        .withExposedPorts(3000)
        .withEnvironment({
            PUBLIC_URL,
            AUTH_API_KEY,
            RP_NAME: 'EUDIPLO',
        })
        .withWaitStrategy(Wait.forHttp('/health', 3000).forStatusCode(200))
        .withLogConsumer((stream) => saveLogs('eudiplo', stream))
        .withBindMounts([
            {
                source: join(__dirname, '..', 'assets'),
                target: '/app/config',
            },
        ])
        .start();
}

beforeAll(async () => {
    //when dev is set, it will not start the container but test against a running instance like `pnpm run start:dev`
    if (!process.env.LOCAL) {
        console.log('Starting EUDIPLO container...');
        container = await startContainer();
        PUBLIC_URL = `http://localhost:${container.getMappedPort(3000)}`;
    }
    axiosInstance = axios.create({
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': AUTH_API_KEY,
        },
        validateStatus: (status) => status >= 200 && status < 300,
    });
});

afterAll(async () => {
    if (!process.env.LOCAL) {
        await container.stop();
    }
});

test('GET / returns EUDIPLO', async () => {
    const response = await axios
        .get<string>(PUBLIC_URL)
        .then((res) => res.data);
    expect(response).toContain('EUDIPLO');
});

test('create oid4vci offer', async () => {
    const res = await axiosInstance
        .post<{ session: string }>(`${PUBLIC_URL}/vci/offer`, {
            response_type: 'uri',
            credentialConfigurationIds: ['pid'],
        })
        .then(
            (res) => res.data,
            (error) => {
                console.error('Error creating oid4vci offer:', error);
                throw error;
            },
        );
    expect(res).toBeDefined();
    const session = res.session;

    //check if the session exists
    await axiosInstance.get(`${PUBLIC_URL}/session/${session}`).then((res) => {
        expect(res.status).toBe(200);
        expect(res.data.id).toBe(session);
    });
});

test('ask for an invalid oid4vci offer', async () => {
    await axiosInstance
        .post(`${PUBLIC_URL}/vci/offer`, {
            response_type: 'uri',
            credentialConfigurationIds: ['invalid'],
        })
        .then(
            () => {
                throw new Error('Expected request to fail');
            },
            (error) => {
                expect(error.response.status).toBe(409);
                expect(error.response.data.message).toContain(
                    'Invalid credential configuration ID',
                );
            },
        );
});

test('get credential from oid4vci offer', async () => {
    const offer = await axiosInstance
        .post<{ session: string; uri: string }>(`${PUBLIC_URL}/vci/offer`, {
            response_type: 'uri',
            credentialConfigurationIds: ['pid'],
        })
        .then((res) => res.data.uri);

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
