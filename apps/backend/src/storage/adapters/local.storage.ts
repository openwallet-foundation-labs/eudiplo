// src/storage/adapters/local.storage.ts

import {
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync,
    rmdirSync,
    statSync,
} from "fs";
import { dirname, join } from "path";
import { Readable } from "stream";
import { FileStorage, PutOptions, StoredObject } from "../storage.types";

export class LocalFileStorage implements FileStorage {
    constructor(private baseDir: string) {}

    async put(
        key: string,
        body: Buffer | Readable,
        opts?: PutOptions,
    ): Promise<StoredObject> {
        const fullPath = join(this.baseDir, key);
        mkdirSync(dirname(fullPath), { recursive: true });

        await new Promise<void>((resolve, reject) => {
            const write = createWriteStream(fullPath);
            const src = body instanceof Readable ? body : Readable.from(body);
            src.pipe(write)
                .on("finish", () => resolve())
                .on("error", reject);
        });

        const st = statSync(fullPath);

        return { key, size: st.size, contentType: opts?.contentType };
    }

    getStream(key: string) {
        const fullPath = join(this.baseDir, key);
        return Promise.resolve({ stream: createReadStream(fullPath) });
    }

    delete(key: string) {
        return Promise.resolve(
            rmdirSync(join(this.baseDir, key), { recursive: true }),
        );
    }

    exists(key: string) {
        return Promise.resolve(existsSync(join(this.baseDir, key)));
    }
}
