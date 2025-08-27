// src/storage/storage.types.ts
import { Readable } from "stream";

export type PutOptions = {
    contentType?: string;
    metadata?: Record<string, string>;
    acl?: "private" | "public";
    checksum?: string; // e.g., sha256 base64
};

export type StoredObject = {
    key: string; // canonical key (e.g. "tenant/2025/08/14/uuid.ext")
    etag?: string;
    size?: number;
    url?: string; // public URL if ACL=public or a presigned URL
    contentType?: string;
    metadata?: Record<string, string>;
};

export interface FileStorage {
    put(
        key: string,
        body: Buffer | Readable,
        opts?: PutOptions,
    ): Promise<StoredObject>;

    getStream(
        key: string,
    ): Promise<{ stream: Readable; contentType?: string; size?: number }>;

    delete(key: string): Promise<void>;

    exists(key: string): Promise<boolean>;

    getSignedUrl?(key: string): Promise<string>; // optional for local
}

export const FILE_STORAGE = Symbol("FILE_STORAGE");
