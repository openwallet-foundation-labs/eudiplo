import * as https from "node:https";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { CacheController } from "./cache.controller";
import { LoteParserService } from "./lote-parser.service";
import { StatusListVerifierService } from "./status-list-verifier.service";
import { TrustStoreService } from "./trust-store.service";
import { TrustListJwtService } from "./trustlist-jwt.service";
import { X509ValidationService } from "./x509-validation.service";

@Module({
    imports: [
        HttpModule.register({
            httpsAgent: new https.Agent({
                rejectUnauthorized: process.env.NODE_ENV === "production",
            }),
        }),
    ],
    controllers: [CacheController],
    providers: [
        TrustListJwtService,
        LoteParserService,
        TrustStoreService,
        X509ValidationService,
        StatusListVerifierService,
    ],
    exports: [
        TrustStoreService,
        X509ValidationService,
        StatusListVerifierService,
    ],
})
export class TrustModule {}
