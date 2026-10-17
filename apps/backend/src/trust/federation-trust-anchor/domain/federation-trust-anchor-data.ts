import type { FederationJwks } from "../schemas/federation-trust-anchor.schema.js";

/** A tenant's federation trust anchor with its pinned federation keys. */
export interface FederationTrustAnchorData {
    id: string;
    tenantId: string;
    entityId: string;
    description?: string | null;
    jwks: FederationJwks;
}
