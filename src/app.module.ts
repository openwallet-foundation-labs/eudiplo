import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { CryptoModule } from './crypto/crypto.module';
import { WellKnownController } from './well-known/well-known.controller';
import { ISSUER_VALIDATION_SCHEMA, IssuerModule } from './issuer/issuer.module';
import { VerifierModule } from './verifier/verifier.module';
import {
    REGISTRAR_VALIDATION_SCHEMA,
    RegistrarModule,
} from './registrar/registrar.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join, isAbsolute } from 'path';
import { KEY_VALIDATION_SCHEMA, KeyModule } from './crypto/key/key.module';
import { CRYPTO_VALIDATION_SCHEMA } from './crypto/key/crypto/crypto.module';
import {
    SESSION_VALIDATION_SCHEMA,
    SessionModule,
} from './session/session.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AUTH_VALIDATION_SCHEMA, AuthModule } from './auth/auth.module';
import { LoggerModule } from 'nestjs-pino';
import { WellKnownService } from './well-known/well-known.service';
import { AppController } from './app/app.controller';

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: Joi.object({
                FOLDER: Joi.string().default('./tmp'),
                RP_NAME: Joi.string().default('EUDIPLO'),
                LOG_LEVEL: Joi.string()
                    .valid('trace', 'debug', 'info', 'warn', 'error', 'fatal')
                    .default(
                        process.env.NODE_ENV === 'production'
                            ? 'warn'
                            : 'debug',
                    ),
                ...AUTH_VALIDATION_SCHEMA,
                ...REGISTRAR_VALIDATION_SCHEMA,
                ...KEY_VALIDATION_SCHEMA,
                ...CRYPTO_VALIDATION_SCHEMA,
                ...ISSUER_VALIDATION_SCHEMA,
                ...SESSION_VALIDATION_SCHEMA,
                LOG_ENABLE_HTTP_LOGGER: Joi.boolean().default(false),
                LOG_ENABLE_SESSION_LOGGER: Joi.boolean().default(false),
                LOG_DEBUG_MODE: Joi.boolean().default(false),
                LOG_FORMAT: Joi.string()
                    .valid('json', 'pretty')
                    .default(
                        process.env.NODE_ENV === 'production'
                            ? 'json'
                            : 'pretty',
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
                    'LOG_ENABLE_HTTP_LOGGER',
                    false,
                );
                //TODO: check if logging to file is needed: https://github.com/iamolegga/nestjs-pino?tab=readme-ov-file#asynchronous-logging
                return {
                    pinoHttp: {
                        level: configService.get('LOG_LEVEL', 'info'),
                        autoLogging: enableHttpLogger,
                        transport: {
                            target: 'pino-pretty',
                            options: {
                                colorize: true,
                                singleLine: false,
                                translateTime: 'yyyy-mm-dd HH:MM:ss',
                                ignore: 'pid,hostname',
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
                                    'user-agent': req.headers['user-agent'],
                                    'content-type': req.headers['content-type'],
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
        KeyModule.forRoot(),
        CryptoModule,
        IssuerModule,
        VerifierModule,
        RegistrarModule,
        ScheduleModule.forRoot(),
        ServeStaticModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const folder = configService.getOrThrow<string>('FOLDER');
                const rootPath = isAbsolute(folder)
                    ? join(folder, 'public')
                    : join(__dirname, '../', folder, 'public');
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
        AuthModule,
    ],
    controllers: [WellKnownController, AppController],
    providers: [WellKnownService],
})
export class AppModule {}
