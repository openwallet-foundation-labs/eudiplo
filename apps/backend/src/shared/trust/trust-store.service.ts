import { Injectable, Logger } from "@nestjs/common";
import { decodeJwt } from "jose";
import { LoTE } from "../../issuer/trust-list/dto/types";
import { LoteParserService } from "./lote-parser.service";
import { TrustListJwtService } from "./trustlist-jwt.service";
import { TrustedEntity, TrustListSource } from "./types";

/**
 * Built trust store with TrustedEntities preserving service groupings.
 */
export type BuiltTrustStore = {
    fetchedAt: number;
    nextUpdate?: string;
    /** TrustedEntities with their services (issuance + revocation) grouped */
    entities: TrustedEntity[];
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
        let nextUpdate: string | undefined;

        for (const ref of source.lotes) {
            const jwt = await this.trustListJwt.fetchJwt(ref.url);
            await this.trustListJwt.verifyTrustListJwt(ref, jwt); // hook
            const decoded = decodeJwt<LoTE>(jwt);

            let parsed = this.loteParser.parse(decoded);
            if (source.acceptedServiceTypes) {
                parsed = this.loteParser.filterByServiceTypes(
                    parsed,
                    source.acceptedServiceTypes,
                );
            }

            nextUpdate = nextUpdate ?? parsed.info.nextUpdate;

            // Add entities preserving grouping
            for (const entity of parsed.entities) {
                entities.push(entity);
            }
        }

        const store: BuiltTrustStore = {
            fetchedAt: Date.now(),
            nextUpdate,
            entities,
        };
        this.cache = store;

        this.logger.debug(
            `Built trust store with ${entities.length} trusted entit${entities.length === 1 ? "y" : "ies"}`,
        );
        return store;
    }

    /**
     * Clear the cached trust store.
     * Useful for testing or when trust lists are known to have changed.
     */
    clearCache(): void {
        this.cache = null;
    }
}
