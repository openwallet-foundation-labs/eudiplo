import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CryptoModule } from "../../crypto/crypto.module";
import { SessionModule } from "../../session/session.module";
import { TrustModule } from "../../shared/trust/trust.module";
import { WebhookService } from "../../shared/utils/webhook/webhook.service";
import { Oid4vpModule } from "../../verifier/oid4vp/oid4vp.module";
import { PresentationsModule } from "../../verifier/presentations/presentations.module";
import { ConfigurationModule } from "../configuration/configuration.module";
import { CredentialOfferController } from "./offer/credential-offer.controller";
import { AuthorizeController } from "./oid4vci/authorize/authorize.controller";
import { AuthorizeService } from "./oid4vci/authorize/authorize.service";
import { InteractiveAuthorizationController } from "./oid4vci/authorize/interactive-authorization.controller";
import { InteractiveAuthorizationService } from "./oid4vci/authorize/interactive-authorization.service";
import { DeferredController } from "./oid4vci/deferred.controller";
import { DeferredTransactionEntity } from "./oid4vci/entities/deferred-transaction.entity";
import { InteractiveAuthSessionEntity } from "./oid4vci/entities/interactive-auth-session.entity";
import { NonceEntity } from "./oid4vci/entities/nonces.entity";
import { Oid4vciMetadataController } from "./oid4vci/metadata/oid4vci-metadata.controller";
import { Oid4vciController } from "./oid4vci/oid4vci.controller";
import { Oid4vciService } from "./oid4vci/oid4vci.service";
import { WellKnownController } from "./oid4vci/well-known/well-known.controller";
import { WellKnownService } from "./oid4vci/well-known/well-known.service";

/**
 * Issuance Module - Handles credential issuance operations
 *
 * Responsibilities:
 * - Creating credential offers
 * - OID4VCI protocol implementation
 * - Authorization and token management
 * - Credential issuance workflows
 */
@Module({
    imports: [
        CryptoModule,
        ConfigurationModule,
        Oid4vpModule,
        PresentationsModule,
        SessionModule,
        HttpModule,
        TrustModule,
        TypeOrmModule.forFeature([
            NonceEntity,
            DeferredTransactionEntity,
            InteractiveAuthSessionEntity,
        ]),
    ],
    controllers: [
        Oid4vciController,
        AuthorizeController,
        InteractiveAuthorizationController,
        CredentialOfferController,
        DeferredController,
        Oid4vciMetadataController,
        WellKnownController,
    ],
    providers: [
        AuthorizeService,
        InteractiveAuthorizationService,
        Oid4vciService,
        WellKnownService,
        WebhookService,
    ],
    exports: [
        AuthorizeService,
        InteractiveAuthorizationService,
        Oid4vciService,
    ],
})
export class IssuanceModule {}
