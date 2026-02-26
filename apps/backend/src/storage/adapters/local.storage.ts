import {
    createReadStream,
    createWriteStream,
    existsSync,
    mkdirSync,
    rmSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { Readable } from "stream";
import { FileStorage } from "../storage.types";

/**
 * Local file storage implementation for development and testing.
 */
export class LocalFileStorage implements FileStorage {
    /**
     * Creates a new instance of LocalFileStorage.
     * @param baseDir
     */
    constructor(private readonly baseDir: string) {}

    /**
     * Saves a file to the local storage.
     * @param key
     * @param body
     */
    async put(key: string, body: Buffer | Readable): Promise<void> {
        const fullPath = join(this.baseDir, key);
        mkdirSync(dirname(fullPath), { recursive: true });

        await new Promise<void>((resolve, reject) => {
            const write = createWriteStream(fullPath);
            const src = body instanceof Readable ? body : Readable.from(body);
            src.pipe(write)
                .on("finish", () => resolve())
                .on("error", reject);
        });
    }

    /**
     * Retrieves a file stream from the local storage.
     * @param key
     * @returns
     */
    getStream(key: string) {
        const fullPath = join(this.baseDir, key);
        return Promise.resolve({ stream: createReadStream(fullPath) });
    }

    /**
     * Deletes a file from the local storage.
     * @param key
     * @returns
     */
    delete(key: string) {
        return Promise.resolve(rmSync(join(this.baseDir, key)));
    }

    /**
     * Checks if a file exists in the local storage.
     * @param key
     * @returns
     */
    exists(key: string) {
        return Promise.resolve(existsSync(join(this.baseDir, key)));
    }
}
