import { S3Client } from "@aws-sdk/client-s3";
import { DynamicModule, Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import * as Joi from "joi";
import { LocalFileStorage } from "./adapters/local.storage";
import { S3FileStorage } from "./adapters/s3.storage";
import { FilesService } from "./files.service";
import { FILE_STORAGE, FileStorage } from "./storage.types";

type Driver = "local" | "s3";

export const CONFIG_STORAGE_SCHEMA = {
    STORAGE_DRIVER: Joi.string().valid("local", "s3").default("local"),
    LOCAL_STORAGE_DIR: Joi.string().when(Joi.ref("STORAGE_DRIVER"), {
        is: "local",
        then: Joi.string().default("uploads"),
    }),
    S3_REGION: Joi.string().when(Joi.ref("STORAGE_DRIVER"), {
        is: "s3",
        then: Joi.required(),
    }),
    S3_BUCKET: Joi.string().when(Joi.ref("STORAGE_DRIVER"), {
        is: "s3",
        then: Joi.required(),
    }),
    S3_ACCESS_KEY_ID: Joi.string().when(Joi.ref("STORAGE_DRIVER"), {
        is: "s3",
        then: Joi.required(),
    }),
    S3_SECRET_ACCESS_KEY: Joi.string().when(Joi.ref("STORAGE_DRIVER"), {
        is: "s3",
        then: Joi.required(),
    }),
    S3_ENDPOINT: Joi.string().when(Joi.ref("STORAGE_DRIVER"), {
        is: "s3",
        then: Joi.optional(),
    }),
    S3_FORCE_PATH_STYLE: Joi.boolean().when(Joi.ref("STORAGE_DRIVER"), {
        is: "s3",
        then: Joi.boolean().default(false),
    }),
    S3_PUBLIC_BASE_URL: Joi.string().when(Joi.ref("STORAGE_DRIVER"), {
        is: "s3",
        then: Joi.required(),
    }),
};

@Global()
@Module({})
export class StorageModule {
    static forRoot(): DynamicModule {
        return {
            module: StorageModule,
            imports: [ConfigModule.forRoot({ isGlobal: true })],
            providers: [
                {
                    provide: FILE_STORAGE,
                    inject: [ConfigService],
                    useFactory: (cfg: ConfigService): FileStorage => {
                        const driver = cfg.get<Driver>("STORAGE_DRIVER");
                        if (driver === "s3") {
                            return new S3FileStorage(
                                new S3Client({
                                    region: cfg.get<string>("S3_REGION"),
                                    endpoint: cfg.get<string>("S3_ENDPOINT"),
                                    forcePathStyle: cfg.get<boolean>(
                                        "S3_FORCE_PATH_STYLE",
                                    ),
                                    credentials: {
                                        accessKeyId:
                                            cfg.get<string>(
                                                "S3_ACCESS_KEY_ID",
                                            )!,
                                        secretAccessKey: cfg.get<string>(
                                            "S3_SECRET_ACCESS_KEY",
                                        )!,
                                    },
                                }),
                                cfg.get<string>("S3_BUCKET")!,
                                cfg.get<string>("S3_PUBLIC_BASE_URL"),
                            );
                        }
                        // local
                        return new LocalFileStorage(
                            cfg.getOrThrow<string>("LOCAL_STORAGE_DIR"),
                        );
                    },
                },
            ],
            exports: [FILE_STORAGE],
        };
    }
}
