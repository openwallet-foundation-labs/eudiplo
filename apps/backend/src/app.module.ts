import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import * as Joi from "joi";
import { memoryStorage } from "multer";
import { LoggerModule } from "nestjs-pino";
import { isAbsolute, join } from "path";
import { AppController } from "./app/app.controller";
import { AUTH_VALIDATION_SCHEMA, AuthModule } from "./auth/auth.module";
import { CryptoModule } from "./crypto/crypto.module";
import { CRYPTO_VALIDATION_SCHEMA } from "./crypto/key/crypto-implementation/crypto-implementation.module";
import { KEY_VALIDATION_SCHEMA, KeyModule } from "./crypto/key/key.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { ISSUER_VALIDATION_SCHEMA, IssuerModule } from "./issuer/issuer.module";
import { MetricModule } from "./metric/metric.module";
import {
    REGISTRAR_VALIDATION_SCHEMA,
    RegistrarModule,
} from "./registrar/registrar.module";
import {
    SESSION_VALIDATION_SCHEMA,
    SessionModule,
} from "./session/session.module";
import { CONFIG_STORAGE_SCHEMA, StorageModule } from "./storage/storage.module";
import { VerifierModule } from "./verifier/verifier.module";
import { WellKnownController } from "./well-known/well-known.controller";
import { WellKnownService } from "./well-known/well-known.service";

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: Joi.object({
                FOLDER: Joi.string().default("../../tmp"),
                RP_NAME: Joi.string().default("EUDIPLO"),
                LOG_LEVEL: Joi.string()
                    .valid("trace", "debug", "info", "warn", "error", "fatal")
                    .default(
                        process.env.NODE_ENV === "production"
                            ? "warn"
                            : "debug",
                    ),
                CONFIG_IMPORT: Joi.boolean().default(false),
                CONFIG_IMPORT_FORCE: Joi.boolean().default(false),
                CONFIG_FOLDER: Joi.string().default("../../assets/config"),
                ...AUTH_VALIDATION_SCHEMA,
                ...REGISTRAR_VALIDATION_SCHEMA,
                ...KEY_VALIDATION_SCHEMA,
                ...CRYPTO_VALIDATION_SCHEMA,
                ...ISSUER_VALIDATION_SCHEMA,
                ...SESSION_VALIDATION_SCHEMA,
                ...CONFIG_STORAGE_SCHEMA,
                LOG_ENABLE_HTTP_LOGGER: Joi.boolean().default(false),
                LOG_ENABLE_SESSION_LOGGER: Joi.boolean().default(false),
                LOG_DEBUG_MODE: Joi.boolean().default(false),
                LOG_FORMAT: Joi.string()
                    .valid("json", "pretty")
                    .default(
                        process.env.NODE_ENV === "production"
                            ? "json"
                            : "pretty",
                    ),
            }),
            isGlobal: true,
            expandVariables: true,
        }),
        LoggerModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const enableHttpLogger = configService.get<boolean>(
                    "LOG_ENABLE_HTTP_LOGGER",
                    false,
                );
                //TODO: check if logging to file is needed: https://github.com/iamolegga/nestjs-pino?tab=readme-ov-file#asynchronous-logging
                return {
                    pinoHttp: {
                        level: configService.get("LOG_LEVEL", "info"),
                        autoLogging: enableHttpLogger,
                        transport: {
                            target: "pino-pretty",
                            options: {
                                colorize: true,
                                singleLine: false,
                                translateTime: "yyyy-mm-dd HH:MM:ss",
                                ignore: "pid,hostname",
                            },
                        },
                        customProps: (req: any) => ({
                            sessionId: req.params?.session,
                        }),
                        serializers: {
                            req: (req: any) => ({
                                method: req.method,
                                url: req.url,
                                headers: {
                                    "user-agent": req.headers["user-agent"],
                                    "content-type": req.headers["content-type"],
                                },
                                sessionId: req.params?.session,
                                tenantId: req.params?.tenantId,
                            }),
                            res: (res: any) => ({
                                statusCode: res.statusCode,
                            }),
                        },
                    },
                };
            },
        }),
        AuthModule,
        KeyModule.forRoot(),
        MulterModule.register({
            storage: memoryStorage(),
        }),
        CryptoModule,
        IssuerModule,
        VerifierModule,
        RegistrarModule,
        ScheduleModule.forRoot(),
        ServeStaticModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const folder = configService.getOrThrow<string>("FOLDER");
                const rootPath = isAbsolute(folder)
                    ? join(folder, "public")
                    : join(__dirname, "../", folder, "public");
                return [
                    {
                        rootPath,
                    },
                ];
            },
        }),
        DatabaseModule,
        SessionModule,
        DatabaseModule,
        HealthModule,
        MetricModule,
        StorageModule.forRoot(),
    ],
    controllers: [WellKnownController, AppController],
    providers: [WellKnownService],
})
export class AppModule {}
