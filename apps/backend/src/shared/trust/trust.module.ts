import * as https from "node:https";
import { HttpModule } from "@nestjs/axios";
import { forwardRef, Module } from "@nestjs/common";
import { CryptoModule } from "../../crypto/crypto.module";
import { CacheController } from "./cache.controller";
import { LoteParserService } from "./lote-parser.service";
import { StatusListVerifierService } from "./status-list-verifier.service";
import { TrustStoreService } from "./trust-store.service";
import { TrustListJwtService } from "./trustlist-jwt.service";
import { WalletAttestationService } from "./wallet-attestation.service";
import { X509ValidationService } from "./x509-validation.service";

@Module({
    imports: [
        HttpModule.register({
            httpsAgent: new https.Agent({
                rejectUnauthorized: process.env.NODE_ENV === "production",
            }),
        }),
        forwardRef(() => CryptoModule),
    ],
    controllers: [CacheController],
    providers: [
        TrustListJwtService,
        LoteParserService,
        TrustStoreService,
        X509ValidationService,
        StatusListVerifierService,
        WalletAttestationService,
    ],
    exports: [
        TrustStoreService,
        X509ValidationService,
        StatusListVerifierService,
        WalletAttestationService,
    ],
})
export class TrustModule {}
