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
import { AppController } from './app/app.controller';
import {
    SESSION_VALIDATION_SCHEMA,
    SessionModule,
} from './session/session.module';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { AUTH_VALIDATION_SCHEMA, AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/auth.guard';

@Module({
    imports: [
        ConfigModule.forRoot({
            validationSchema: Joi.object({
                FOLDER: Joi.string().default('./assets'),
                RP_NAME: Joi.string().default('EUDIPLO'),
                ...AUTH_VALIDATION_SCHEMA,
                ...REGISTRAR_VALIDATION_SCHEMA,
                ...KEY_VALIDATION_SCHEMA,
                ...CRYPTO_VALIDATION_SCHEMA,
                ...ISSUER_VALIDATION_SCHEMA,
                ...SESSION_VALIDATION_SCHEMA,
            }),
            isGlobal: true,
            expandVariables: true,
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
})
export class AppModule {}
