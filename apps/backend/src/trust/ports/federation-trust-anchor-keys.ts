import type { JWK } from "jose";

/** The federation keys of a trust anchor, obtained out of band. */
export interface PinnedJwks {
    keys: JWK[];
}

/**
 * The pinned keys of the trust anchors a tenant registered (OpenID
 * Federation 1.0 Section 10.2). A trust anchor without pinned keys is never
 * trusted.
 */
export interface FederationTrustAnchorKeys {
    /** Pinned keys by entity ID, for those of `entityIds` the tenant registered. */
    findPinnedKeys(
        tenantId: string,
        entityIds: string[],
    ): Promise<Map<string, PinnedJwks>>;
}

export const FEDERATION_TRUST_ANCHOR_KEYS = Symbol(
    "FEDERATION_TRUST_ANCHOR_KEYS",
);
