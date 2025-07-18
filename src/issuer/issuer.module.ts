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
import { IssuanceConfig } from './credentials/entities/issuance-config.entity';

export const ISSUER_VALIDATION_SCHEMA = {
    PUBLIC_URL: Joi.string(),
};

@Module({
    imports: [
        CryptoModule,
        StatusListModule,
        Oid4vpModule,
        SessionModule,
        TypeOrmModule.forFeature([IssuanceConfig]),
    ],
    controllers: [
        Oid4vciController,
        AuthorizeController,
        CredentialsController,
        IssuerManagementController,
    ],
    providers: [AuthorizeService, CredentialsService, Oid4vciService],
    exports: [AuthorizeService, Oid4vciService],
})
export class IssuerModule {}
