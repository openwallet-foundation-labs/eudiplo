import { Injectable, Logger } from "@nestjs/common";
import { decodeJwt } from "jose";
import { LoteParserService } from "./lote-parser.service";
import { TrustListJwtService } from "./trustlist-jwt.service";
import { TrustListSource } from "./types";

export type TrustAnchorEntry = {
    serviceTypeIdentifier: string;
    certValue: string; // PEM or base64/DER
};

export type BuiltTrustStore = {
    fetchedAt: number;
    nextUpdate?: string;
    anchors: TrustAnchorEntry[];
};

@Injectable()
export class TrustStoreService {
    private readonly logger = new Logger(TrustStoreService.name);
    private cache: BuiltTrustStore | null = null;

    constructor(
        private readonly trustListJwt: TrustListJwtService,
        private readonly loteParser: LoteParserService,
    ) {}

    async getTrustStore(
        source: TrustListSource,
        cacheTtlMs = 5 * 60 * 1000,
    ): Promise<BuiltTrustStore> {
        if (this.cache && Date.now() - this.cache.fetchedAt < cacheTtlMs)
            return this.cache;

        const anchors: TrustAnchorEntry[] = [];
        let nextUpdate: string | undefined;

        for (const ref of source.lotes) {
            const jwt = await this.trustListJwt.fetchJwt(ref.url);
            await this.trustListJwt.verifyTrustListJwt(ref, jwt); // hook
            const decoded = decodeJwt(jwt);

            let parsed = this.loteParser.parse(decoded.payload);
            if (source.acceptedServiceTypes) {
                parsed = this.loteParser.filterByServiceTypes(
                    parsed,
                    source.acceptedServiceTypes,
                );
            }

            nextUpdate = nextUpdate ?? parsed.info.nextUpdate;

            for (const svc of parsed.services) {
                anchors.push({
                    serviceTypeIdentifier: svc.serviceTypeIdentifier,
                    certValue: svc.certValue,
                });
            }
        }

        const store: BuiltTrustStore = {
            fetchedAt: Date.now(),
            nextUpdate,
            anchors,
        };
        this.cache = store;

        this.logger.debug(
            `Built trust store with ${anchors.length} anchor cert(s)`,
        );
        return store;
    }
}
