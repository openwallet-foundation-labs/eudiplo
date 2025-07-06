import { MiddlewareConsumer, Module } from '@nestjs/common';
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
import { join } from 'path';
import { KEY_VALIDATION_SCHEMA, KeyModule } from './crypto/key/key.module';
import { CRYPTO_VALIDATION_SCHEMA } from './crypto/key/crypto/crypto.module';
import { AppController } from './app/app.controller';
import { SessionModule } from './session/session.module';
import { LoggerMiddleware } from './logger';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        FOLDER: Joi.string().default('./assets'),
        PUBLIC_FOLDER: Joi.string().default('../assets/public'),
        ...REGISTRAR_VALIDATION_SCHEMA,
        ...KEY_VALIDATION_SCHEMA,
        ...CRYPTO_VALIDATION_SCHEMA,
        ...ISSUER_VALIDATION_SCHEMA,
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
      useFactory: (configService: ConfigService) => [
        {
          rootPath: join(
            __dirname,
            configService.getOrThrow<string>('PUBLIC_FOLDER'),
          ),
        },
      ],
    }),
    DatabaseModule,
    SessionModule,
    DatabaseModule,
    HealthModule,
  ],
  controllers: [WellKnownController, AppController],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    //consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
