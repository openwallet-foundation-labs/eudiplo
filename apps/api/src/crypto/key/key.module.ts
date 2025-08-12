import { HttpModule, HttpService } from '@nestjs/axios';
import { DynamicModule, Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { getRepositoryToken, TypeOrmModule } from '@nestjs/typeorm';
import * as Joi from 'joi';
import { PinoLogger } from 'nestjs-pino';
import { Repository } from 'typeorm/repository/Repository';
import { CryptoImplementatationModule } from './crypto-implementation/crypto-implementation.module';
import { CryptoImplementationService } from './crypto-implementation/crypto-implementation.service';
import { CertEntity } from './entities/cert.entity';
import { FileSystemKeyService } from './filesystem-key.service';
import { VaultKeyService } from './vault-key.service';

export const KEY_VALIDATION_SCHEMA = {
  KM_TYPE: Joi.string().valid('file', 'vault').default('file'),

  // Vault-related config
  VAULT_URL: Joi.string().uri().when('KM_TYPE', {
    is: 'vault',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  VAULT_TOKEN: Joi.string().when('KM_TYPE', {
    is: 'vault',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
};

@Global()
@Module({})
export class KeyModule {
  static forRoot(): DynamicModule {
    return {
      module: KeyModule,
      imports: [
        HttpModule,
        ConfigModule,
        CryptoImplementatationModule,
        TypeOrmModule.forFeature([CertEntity]),
      ],
      providers: [
        {
          provide: 'KeyService',
          useFactory: (
            configService: ConfigService,
            httpService: HttpService,
            cryptoService: CryptoImplementationService,
            certRepository: Repository<CertEntity>
          ) => {
            const kmType = configService.get<'vault' | 'file'>('KM_TYPE');
            if (kmType === 'vault') {
              return new VaultKeyService(
                httpService,
                configService,
                cryptoService,
                certRepository
              );
            }

            return new FileSystemKeyService(
              configService,
              cryptoService,
              certRepository
            );
          },
          inject: [
            ConfigService,
            HttpService,
            CryptoImplementationService,
            getRepositoryToken(CertEntity),
          ],
        },
      ],
      exports: ['KeyService'],
    };
  }
}
