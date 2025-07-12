import { GenericContainer, Wait } from 'testcontainers';
import { afterAll, beforeAll, expect, test } from 'vitest';

let container: Awaited<ReturnType<typeof startContainer>>;

async function startContainer() {
    return await new GenericContainer('ghcr.io/cre8/eudiplo:latest')
        .withExposedPorts(3000)
        .withEnvironment({
            PUBLIC_URL: 'http://localhost:3000',
            AUTH_API_KEY: 'test-api-key',
            RP_NAME: 'EUDIPLO',
        })
        .withWaitStrategy(Wait.forHttp('/health', 3000).forStatusCode(200))
        .start()
        .then((c) => {
            console.log(`Container started on port ${c.getMappedPort(3000)}`);
            return c;
        });
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
