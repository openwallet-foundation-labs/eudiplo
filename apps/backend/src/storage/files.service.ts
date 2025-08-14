// src/files/files.service.ts
import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { extname } from "path";
import { Readable } from "stream";
import {
    FILE_STORAGE,
    FileStorage,
    StoredObject,
} from "../storage/storage.types";

@Injectable()
export class FilesService {
    constructor(@Inject(FILE_STORAGE) private storage: FileStorage) {}

    saveUserUpload(
        tenantId: string,
        fileName: string,
        body: Buffer | Readable,
        contentType?: string,
        isPublic = false,
    ): Promise<StoredObject> {
        const safeExt = extname(fileName || "")
            .toLowerCase()
            .slice(1);
        const key = `${tenantId}/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${safeExt ? "." + safeExt : ""}`;

        // TODO: add checksum if you want tamper detection:
        // const checksum = createHash('sha256').update(bufferOrStreamToBuffer(body)).digest('base64');

        return this.storage.put(key, body, {
            contentType,
            acl: isPublic ? "public" : "private",
            metadata: { originalName: fileName },
        });
    }

    getStream(key: string) {
        return Promise.resolve(this.storage.getStream(key));
    }

    delete(key: string) {
        return Promise.resolve(this.storage.delete(key));
    }

    getDownloadUrl(key: string, ttlSeconds = 300) {
        if (this.storage.getSignedUrl)
            return this.storage.getSignedUrl(key, ttlSeconds);
        // For local, expose via your HTTP controller at /files/:key
        return Promise.resolve(undefined);
    }
}
