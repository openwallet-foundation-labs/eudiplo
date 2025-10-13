import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { setGlobalConfig } from "@openid4vc/openid4vci";
import { CryptoModule } from "../crypto/crypto.module";
import { SessionModule } from "../session/session.module";
import { WebhookService } from "../utils/webhook/webhook.service";
import { Oid4vpModule } from "../verifier/oid4vp/oid4vp.module";
import { AuthorizeController } from "./authorize/authorize.controller";
import { AuthorizeService } from "./authorize/authorize.service";
import { CredentialConfigService } from "./credentials/credential-config/credential-config.service";
import { CredentialsController } from "./credentials/credentials.controller";
import { CredentialsService } from "./credentials/credentials.service";
import { CredentialConfig } from "./credentials/entities/credential.entity";
import { CredentialsMetadataController } from "./credentials-metadata/credentials-metadata.controller";
import { DisplayController } from "./display/display.controller";
import { DisplayService } from "./display/display.service";
import { DisplayEntity } from "./display/entities/display.entity";
import { IssuanceConfig } from "./issuance/entities/issuance-config.entity";
import { IssuanceController } from "./issuance/issuance.controller";
import { IssuanceService } from "./issuance/issuance.service";
import { IssuerManagementController } from "./issuer-management/issuer-management.controller";
import { Oid4vciController } from "./oid4vci/oid4vci.controller";
import { Oid4vciService } from "./oid4vci/oid4vci.service";
import { StatusListModule } from "./status-list/status-list.module";

@Module({
    imports: [
        CryptoModule,
        StatusListModule,
        Oid4vpModule,
        SessionModule,
        HttpModule,
        TypeOrmModule.forFeature([
            IssuanceConfig,
            CredentialConfig,
            DisplayEntity,
        ]),
    ],
    controllers: [
        Oid4vciController,
        AuthorizeController,
        CredentialsController,
        IssuerManagementController,
        IssuanceController,
        CredentialsMetadataController,
        DisplayController,
    ],
    providers: [
        AuthorizeService,
        CredentialsService,
        Oid4vciService,
        IssuanceService,
        CredentialConfigService,
        WebhookService,
        DisplayService,
    ],
    exports: [
        AuthorizeService,
        Oid4vciService,
        DisplayService,
        IssuanceService,
        CredentialConfigService,
    ],
})
export class IssuerModule {
    constructor(configService: ConfigService) {
        const unsecure = configService
            .getOrThrow<string>("PUBLIC_URL")
            .startsWith("http://");
        setGlobalConfig({ allowInsecureUrls: unsecure });
    }
}
