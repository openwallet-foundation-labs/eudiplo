import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { memoryStorage } from "multer";
import { LoggerModule } from "nestjs-pino";
import { isAbsolute, join } from "path";
import { AppController } from "./app/app.controller";
import { AuthModule } from "./auth/auth.module";
import { CryptoModule } from "./crypto/crypto.module";
import { KeyModule } from "./crypto/key/key.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";
import { IssuerModule } from "./issuer/issuer.module";
import { MetricModule } from "./metric/metric.module";
import { RegistrarModule } from "./registrar/registrar.module";
import { SessionModule } from "./session/session.module";
import { StorageModule } from "./storage/storage.module";
import { VALIDATION_SCHEMA } from "./utils/config-printer/combined.schema";
import { VerifierModule } from "./verifier/verifier.module";
import { WellKnownController } from "./well-known/well-known.controller";
import { WellKnownService } from "./well-known/well-known.service";

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: VALIDATION_SCHEMA,
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
