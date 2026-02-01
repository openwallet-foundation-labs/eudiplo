import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigImportService } from "../shared/utils/config-import/config-import.service";
import {
    ConfigImportOrchestratorService,
    ImportPhase,
} from "../shared/utils/config-import/config-import-orchestrator.service";
import {
    FILE_STORAGE,
    FileStorage,
    StoredObject,
} from "../storage/storage.types";
import { FileEntity } from "./entities/files.entity";

interface FileImportData {
    filename: string;
    content: Buffer;
}

@Injectable()
export class FilesService {
    constructor(
        @Inject(FILE_STORAGE) private readonly storage: FileStorage,
        @InjectRepository(FileEntity)
        private readonly fileRepository: Repository<FileEntity>,
        private readonly configService: ConfigService,
        private readonly configImportService: ConfigImportService,
        private readonly orchestrator: ConfigImportOrchestratorService,
    ) {
        this.orchestrator.register(
            "images",
            ImportPhase.CORE,
            this.importForTenant.bind(this),
        );
    }

    /**
     * Import images from the config folder for a specific tenant
     */
    async importForTenant(tenantId: string) {
        await this.configImportService.importConfigsForTenant<FileImportData>(
            tenantId,
            {
                subfolder: "images",
                resourceType: "image",
                loadData: (filePath) => {
                    const filename = filePath.split("/").pop() || "";
                    return {
                        filename,
                        content: readFileSync(filePath),
                    };
                },
                checkExists: async (_tenantId, data) => {
                    const exists = await this.fileRepository.findOneBy({
                        filename: data.filename,
                        tenantId,
                    });
                    return !!exists;
                },
                processItem: async (_tenantId, data) => {
                    const key = randomUUID();
                    await this.storage.put(key, data.content, {
                        contentType: "application/octet-stream",
                        acl: "public",
                        metadata: { originalName: data.filename },
                    });
                    await this.fileRepository.save({
                        id: key,
                        filename: data.filename,
                        tenantId,
                    });
                },
            },
        );
    }

    /**
     * Replaces a file name with the actual public URL if it is not already a URL
     * @param tenantId
     * @param fileName
     * @returns
     */
    replaceUriWithPublicUrl(tenantId: string, fileName: string) {
        if (fileName.startsWith("http")) return fileName;
        return this.fileRepository
            .findOneBy({ tenantId, filename: fileName })
            .then((file) =>
                file
                    ? `${this.configService.get<string>("PUBLIC_URL")}/storage/${file.id}`
                    : undefined,
            );
    }

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
        const key = randomUUID();
        const response = await this.storage.put(key, file.buffer, {
            contentType: file.mimetype,
            acl: isPublic ? "public" : "private",
            metadata: { originalName: file.originalname },
        });
        await this.fileRepository.save({
            id: key,
            filename: file.originalname,
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
