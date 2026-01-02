import { Injectable, Logger } from "@nestjs/common";
import { decodeJwt } from "jose";
import { LoteParserService } from "./lote-parser.service";
import { TrustListJwtService } from "./trustlist-jwt.service";
import { TrustedEntity, TrustListSource } from "./types";

/**
 * @deprecated Use TrustedEntity instead
 */
export type TrustAnchorEntry = {
    serviceTypeIdentifier: string;
    certValue: string; // PEM or base64/DER
};

/**
 * Built trust store with TrustedEntities preserving service groupings.
 */
export type BuiltTrustStore = {
    fetchedAt: number;
    nextUpdate?: string;
    /** TrustedEntities with their services (issuance + revocation) grouped */
    entities: TrustedEntity[];
    /** @deprecated Flattened anchors for backwards compatibility */
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

        const entities: TrustedEntity[] = [];
        const anchors: TrustAnchorEntry[] = [];
        let nextUpdate: string | undefined;

        for (const ref of source.lotes) {
            const jwt = await this.trustListJwt.fetchJwt(ref.url);
            await this.trustListJwt.verifyTrustListJwt(ref, jwt); // hook
            const decoded = decodeJwt(jwt);

            let parsed = this.loteParser.parseV2(decoded);
            if (source.acceptedServiceTypes) {
                parsed = this.loteParser.filterEntitiesByServiceTypes(
                    parsed,
                    source.acceptedServiceTypes,
                );
            }

            nextUpdate = nextUpdate ?? parsed.info.nextUpdate;

            // Add entities preserving grouping
            for (const entity of parsed.entities) {
                entities.push(entity);
            }

            // Also populate flat anchors for backwards compatibility
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
            entities,
            anchors,
        };
        this.cache = store;

        this.logger.debug(
            `Built trust store with ${entities.length} trusted entit(y/ies), ${anchors.length} anchor cert(s)`,
        );
        return store;
    }
}
