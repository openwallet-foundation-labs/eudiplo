import { existsSync, mkdirSync, rmSync, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { GenericContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, expect, test } from 'vitest';

let container: Awaited<ReturnType<typeof startContainer>>;

export const logFolder = './logs';

/**
 * Writes the logs to a file
 * @param fileName
 * @param stream
 */
export function saveLogs(fileName: string, stream: Readable) {
    if (!existsSync(logFolder)) {
        mkdirSync(logFolder, { recursive: true });
        console.log(`Created log folder: ${logFolder}`);
    }
    const filePath = `${logFolder}/${fileName}.log`;
    if (existsSync(fileName)) {
        rmSync(fileName);
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
            PUBLIC_URL: 'http://localhost:3000',
            AUTH_API_KEY: 'test-api-key',
            RP_NAME: 'EUDIPLO',
        })
        .withWaitStrategy(Wait.forHttp('/health', 3000).forStatusCode(200))
        .withLogConsumer((stream) => saveLogs('eudiplo', stream))
        .start();
}

beforeAll(async () => {
    container = await startContainer();
});

afterAll(async () => {
    await container.stop();
});

test('GET / returns EUDIPLO', async () => {
    const port = container.getMappedPort(3000);
    const url = `http://localhost:${port}/`;
    const response = await fetch(url);
    const body = await response.text();
    expect(body).toContain('EUDIPLO');
});
