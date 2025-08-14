// src/storage/adapters/s3.storage.ts
import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl as sign } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { FileStorage, PutOptions, StoredObject } from "../storage.types";

export class S3FileStorage implements FileStorage {
    constructor(
        private s3: S3Client,
        private bucket: string,
        private publicBaseUrl?: string, // e.g. CloudFront URL (optional)
    ) {}

    async put(
        key: string,
        body: Buffer | Readable,
        opts?: PutOptions,
    ): Promise<StoredObject> {
        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: body,
                ContentType: opts?.contentType,
                Metadata: opts?.metadata,
                ACL: opts?.acl === "public" ? "public-read" : undefined,
                ChecksumSHA256: opts?.checksum, // optional if you computed it
            }),
        );

        const head = await this.s3.send(
            new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        const url =
            opts?.acl === "public"
                ? this.publicBaseUrl
                    ? `${this.publicBaseUrl.replace(/\/+$/, "")}/${encodeURI(key)}`
                    : `https://${this.bucket}.s3.amazonaws.com/${encodeURI(key)}`
                : undefined;

        return {
            key,
            etag: head.ETag,
            size: head.ContentLength,
            url,
            contentType: head.ContentType || opts?.contentType,
        };
    }

    async getStream(key: string) {
        const obj = await this.s3.send(
            new GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        const stream = obj.Body as Readable;
        return {
            stream,
            contentType: obj.ContentType,
            size: obj.ContentLength,
        };
    }

    async delete(key: string) {
        await this.s3.send(
            new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
    }

    async exists(key: string) {
        try {
            await this.s3.send(
                new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
            );
            return true;
        } catch {
            return false;
        }
    }

    async getSignedUrl(key: string, expiresInSec: number) {
        return sign(
            this.s3,
            new GetObjectCommand({ Bucket: this.bucket, Key: key }),
            { expiresIn: expiresInSec },
        );
    }
}
