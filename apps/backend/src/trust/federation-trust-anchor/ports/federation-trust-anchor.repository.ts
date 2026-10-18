import type { FederationTrustAnchorData } from "../domain/federation-trust-anchor-data.js";

export const FEDERATION_TRUST_ANCHOR_REPOSITORY = Symbol(
    "FEDERATION_TRUST_ANCHOR_REPOSITORY",
);

export interface FederationTrustAnchorRepository {
    listForTenant(tenantId: string): Promise<FederationTrustAnchorData[]>;
    findForTenant(
        tenantId: string,
        id: string,
    ): Promise<FederationTrustAnchorData | null>;
    findByEntityIds(
        tenantId: string,
        entityIds: string[],
    ): Promise<FederationTrustAnchorData[]>;
    save(anchor: FederationTrustAnchorData): Promise<FederationTrustAnchorData>;
    deleteForTenant(tenantId: string, id: string): Promise<void>;
}
