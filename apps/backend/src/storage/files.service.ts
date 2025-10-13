import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { randomUUID } from "crypto";
import { readdirSync, readFileSync } from "fs";
import { PinoLogger } from "nestjs-pino";
import { join } from "path";
import { Repository } from "typeorm";
import {
    FILE_STORAGE,
    FileStorage,
    StoredObject,
} from "../storage/storage.types";
import { FileEntity } from "./entities/files.entity";

@Injectable()
export class FilesService implements OnApplicationBootstrap {
    constructor(
        @Inject(FILE_STORAGE) private storage: FileStorage,
        @InjectRepository(FileEntity)
        private fileRepository: Repository<FileEntity>,
        private configService: ConfigService,
        private logger: PinoLogger,
    ) {}

    /**
     * On application bootstrap, import images from the config folder
     * @returns
     */
    onApplicationBootstrap() {
        return this.import();
    }

    /**
     * Import images from the config folder
     */
    async import() {
        const configPath = this.configService.getOrThrow("CONFIG_FOLDER");
        const subfolder = "images";
        const force = this.configService.get<boolean>("CONFIG_IMPORT_FORCE");
        if (this.configService.get<boolean>("CONFIG_IMPORT")) {
            const tenantFolders = readdirSync(configPath, {
                withFileTypes: true,
            }).filter((tenant) => tenant.isDirectory());
            for (const tenant of tenantFolders) {
                let counter = 0;
                //iterate over all elements in the folder and import them
                const path = join(configPath, tenant.name, subfolder);
                const files = readdirSync(path);
                for (const file of files) {
                    //check if already exists
                    const exists = await this.fileRepository.findOneBy({
                        filename: file,
                        tenantId: tenant.name,
                    });
                    if (exists && !force) {
                        this.logger.info(
                            {
                                event: "Import",
                            },
                            `Image ${file} already exists for ${tenant.name}, skipping`,
                        );
                        continue;
                    }

                    const key = randomUUID();
                    await this.storage.put(
                        key,
                        readFileSync(join(path, file)),
                        {
                            contentType: "application/octet-stream",
                            acl: "public",
                            metadata: { originalName: file },
                        },
                    );
                    await this.fileRepository.save({
                        id: key,
                        filename: file,
                        tenantId: tenant.name,
                    });
                    counter++;
                }
                this.logger.info(
                    {
                        event: "Import",
                    },
                    `${counter} images imported for ${tenant.name}`,
                );
            }
        }
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
