import * as https from "node:https";
import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { LoteParserService } from "./lote-parser.service";
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
    providers: [
        TrustListJwtService,
        LoteParserService,
        TrustStoreService,
        X509ValidationService,
    ],
    exports: [TrustStoreService, X509ValidationService],
})
export class TrustModule {}
