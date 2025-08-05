import { DynamicModule, Global, Module } from '@nestjs/common';
import { FileSystemKeyService } from './filesystem-key.service';
import { VaultKeyService } from './vault-key.service';
import { CryptoModule } from './crypto/crypto.module';
import { CryptoImplementationService } from './crypto/crypto.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule, HttpService } from '@nestjs/axios';
import * as Joi from 'joi';
import { CertEntity } from './entities/cert.entity';
import { Repository } from 'typeorm/repository/Repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PinoLogger } from 'nestjs-pino';

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
                CryptoModule,
                TypeOrmModule.forFeature([CertEntity]),
            ],
            providers: [
                {
                    provide: 'KeyService',
                    useFactory: (
                        configService: ConfigService,
                        httpService: HttpService,
                        cryptoService: CryptoImplementationService,
                        certRepository: Repository<CertEntity>,
                        logger: PinoLogger,
                    ) => {
                        const kmType = configService.get<'vault' | 'file'>(
                            'KM_TYPE',
                        );
                        if (kmType === 'vault') {
                            return new VaultKeyService(
                                httpService,
                                configService,
                                cryptoService,
                                certRepository,
                            );
                        }

                        return new FileSystemKeyService(
                            configService,
                            cryptoService,
                            certRepository,
                            logger,
                        );
                    },
                    inject: [
                        ConfigService,
                        HttpService,
                        CryptoImplementationService,
                        getRepositoryToken(CertEntity),
                        PinoLogger,
                    ],
                },
            ],
            exports: ['KeyService'],
        };
    }
}
