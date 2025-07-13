import type { Request } from 'express';
import { existsSync, mkdirSync, rmSync, createWriteStream } from 'fs';
import { join } from 'path/posix';
import { Readable } from 'stream';
import { GenericContainer, Wait } from 'testcontainers';

export function getHeadersFromRequest(req: Request): globalThis.Headers {
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
            for (const v of value) {
                headers.append(key, v);
            }
        } else if (value !== undefined) {
            headers.set(key, value);
        }
    }

    return headers;
}
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
export async function startContainer() {
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
