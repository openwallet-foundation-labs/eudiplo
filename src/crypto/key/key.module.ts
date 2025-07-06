import { DynamicModule, Global, Module } from '@nestjs/common';
import { FileSystemKeyService } from './filesystem-key.service';
import { VaultKeyService } from './vault-key.service';
import { CryptoModule } from './crypto/crypto.module';
import { CryptoService } from './crypto/crypto.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import * as Joi from 'joi';

export const KEY_VALIDATION_SCHEMA = {
  KM_TYPE: Joi.string().valid('file', 'vault').default('file'),

  // Vault-related config
  VAULT_URL: Joi.string().uri().when('KM_TYPE', {
    is: 'vault',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  VAULT_TOKEN: Joi.string().when('KM_TYPE', {
    is: 'vault',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),
  VAULT_KEY_ID: Joi.string().when('KM_TYPE', {
    is: 'vault',
    then: Joi.required(),
    otherwise: Joi.forbidden(),
  }),

  // File-based config
  KM_FOLDER: Joi.string().when('KM_TYPE', {
    is: 'file',
    then: Joi.string().default('./config/keys'),
    otherwise: Joi.forbidden(),
  }),
};

@Global()
@Module({})
export class KeyModule {
  static forRoot(): DynamicModule {
    return {
      module: KeyModule,
      imports: [HttpModule, ConfigModule, CryptoModule],
      providers: [
        {
          provide: 'KeyService',
          useFactory: (
            configService: ConfigService,
            httpService: HttpService,
            cryptoService: CryptoService,
          ) => {
            const kmType = configService.get<'vault' | 'file'>('KM_TYPE');

            if (kmType === 'vault') {
              return new VaultKeyService(
                httpService,
                configService,
                cryptoService,
              );
            }

            return new FileSystemKeyService(configService, cryptoService);
          },
          inject: [ConfigService, HttpService, CryptoService],
        },
      ],
      exports: ['KeyService'],
    };
  }
}
