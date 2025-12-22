import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CryptoModule } from "../../crypto/crypto.module";
import { SessionModule } from "../../session/session.module";
import { WebhookService } from "../../shared/utils/webhook/webhook.service";
import { StatusListModule } from "../lifecycle/status/status-list.module";
import { CredentialConfigService } from "./credentials/credential-config/credential-config.service";
import { CredentialConfigController } from "./credentials/credential-config.controller";
import { CredentialsService } from "./credentials/credentials.service";
import { CredentialConfig } from "./credentials/entities/credential.entity";
import { IssuanceConfig } from "./issuance/entities/issuance-config.entity";
import { IssuanceService } from "./issuance/issuance.service";
import { IssuanceConfigController } from "./issuance/issuance-config.controller";

/**
 * Configuration Module - Manages issuer configurations and credential definitions
 *
 * Responsibilities:
 * - Issuance configuration management
 * - Credential type definitions
 * - Credential schemas and metadata
 */
@Module({
    imports: [
        CryptoModule,
        StatusListModule,
        HttpModule,
        SessionModule,
        TypeOrmModule.forFeature([IssuanceConfig, CredentialConfig]),
    ],
    controllers: [IssuanceConfigController, CredentialConfigController],
    providers: [
        IssuanceService,
        CredentialsService,
        CredentialConfigService,
        WebhookService,
    ],
    exports: [IssuanceService, CredentialConfigService, CredentialsService],
})
export class ConfigurationModule {}
