import { Module } from '@nestjs/common';
import { AuthorizeService } from './authorize/authorize.service';
import { CredentialsService } from './credentials/credentials.service';
import { Oid4vciService } from './oid4vci/oid4vci.service';
import { Oid4vciController } from './oid4vci/oid4vci.controller';
import { AuthorizeController } from './authorize/authorize.controller';
import { CryptoModule } from '../crypto/crypto.module';
import { StatusListModule } from './status-list/status-list.module';
import { CredentialsController } from './credentials/credentials.controller';
import * as Joi from 'joi';
import { SessionModule } from '../session/session.module';
import { IssuerManagementController } from './issuer-management/issuer-management.controller';
import { Oid4vpModule } from '../verifier/oid4vp/oid4vp.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IssuanceConfig } from './issuance/entities/issuance-config.entity';
import { SessionLoggerService } from '../utils/session-logger.service';
import { SessionLoggerInterceptor } from '../utils/session-logger.interceptor';
import { CredentialConfig } from './credentials/entities/credential.entity';
import { IssuanceController } from './issuance/issuance.controller';
import { CredentialsMetadataController } from './credentials-metadata/credentials-metadata.controller';
import { IssuanceService } from './issuance/issuance.service';
import { CredentialConfigService } from './credentials/credential-config/credential-config.service';
import { setGlobalConfig } from '@openid4vc/openid4vci';
import { ConfigService } from '@nestjs/config';

export const ISSUER_VALIDATION_SCHEMA = {
    PUBLIC_URL: Joi.string(),
};

@Module({
    imports: [
        CryptoModule,
        StatusListModule,
        Oid4vpModule,
        SessionModule,
        TypeOrmModule.forFeature([IssuanceConfig, CredentialConfig]),
    ],
    controllers: [
        Oid4vciController,
        AuthorizeController,
        CredentialsController,
        IssuerManagementController,
        IssuanceController,
        CredentialsMetadataController,
    ],
    providers: [
        AuthorizeService,
        CredentialsService,
        Oid4vciService,
        SessionLoggerService,
        SessionLoggerInterceptor,
        IssuanceService,
        CredentialConfigService,
    ],
    exports: [AuthorizeService, Oid4vciService],
})
export class IssuerModule {
    constructor(configService: ConfigService) {
        const unsecure = configService
            .getOrThrow<string>('PUBLIC_URL')
            .startsWith('http://');
        setGlobalConfig({ allowInsecureUrls: unsecure });
    }
}
