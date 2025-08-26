import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { extname } from "path";
import { Repository } from "typeorm";
import {
    FILE_STORAGE,
    FileStorage,
    StoredObject,
} from "../storage/storage.types";
import { FileEntity } from "./entities/files.entity";

@Injectable()
export class FilesService {
    constructor(
        @Inject(FILE_STORAGE) private storage: FileStorage,
        @InjectRepository(FileEntity)
        private fileRepository: Repository<FileEntity>,
        private configService: ConfigService,
    ) {}

    /**
     * Saves a user-uploaded file to the storage.
     * @param tenantId The ID of the tenant uploading the file.
     * @param file The file to upload.
     * @param isPublic Whether the file should be publicly accessible.
     * @returns The metadata of the stored file.
     */
    async saveUserUpload(
        tenantId: string,
        file: Express.Multer.File,
        isPublic = false,
    ): Promise<StoredObject> {
        const safeExt = extname(file.originalname || "")
            .toLowerCase()
            .slice(1);
        const key = `${new Date().toISOString().slice(0, 10)}-${randomUUID()}${safeExt ? "." + safeExt : ""}`;

        // TODO: add checksum if you want tamper detection:
        // const checksum = createHash('sha256').update(bufferOrStreamToBuffer(body)).digest('base64');

        const response = await this.storage.put(key, file.buffer, {
            contentType: file.mimetype,
            acl: isPublic ? "public" : "private",
            metadata: { originalName: file.originalname },
        });
        await this.fileRepository.save({
            id: key,
            tenantId,
        });
        const url = await this.getDownloadUrl(response.key);
        return {
            key: response.key,
            url,
        };
    }

    /**
     * Retrieves a readable stream of the file associated with the given key.
     * @param key The unique identifier of the file.
     * @returns A promise that resolves to a readable stream of the file.
     */
    getStream(key: string) {
        return Promise.resolve(this.storage.getStream(key));
    }

    /**
     * Deletes a file from the storage.
     * @param key The unique identifier of the file.
     * @returns A promise that resolves when the file is deleted.
     */
    delete(key: string) {
        return Promise.resolve(this.storage.delete(key));
    }

    getDownloadUrl(key: string) {
        if (this.storage.getSignedUrl) return this.storage.getSignedUrl(key);
        return Promise.resolve(
            `${this.configService.get<string>("PUBLIC_URL")}/storage/${key}`,
        );
    }

    /**
     * Deletes all files associated with a specific tenant
     * @param tenantId The ID of the tenant whose files should be deleted.
     */
    async deleteByTenant(tenantId: string) {
        const files = await this.fileRepository.find({ where: { tenantId } });
        await Promise.all(files.map((file) => this.storage.delete(file.id)));
        await this.fileRepository.delete({ tenantId });
    }
}
