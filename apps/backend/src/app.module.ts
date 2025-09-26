import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MulterModule } from "@nestjs/platform-express";
import { ScheduleModule } from "@nestjs/schedule";
import { ServeStaticModule } from "@nestjs/serve-static";
import { memoryStorage } from "multer";
import { LoggerModule } from "nestjs-pino";
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
import { createLoggerOptions } from "./utils/logger/logger.factory";
import { createServeStaticOptions } from "./utils/serve-static.factory";
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
            useFactory: createLoggerOptions,
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
            useFactory: createServeStaticOptions,
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
