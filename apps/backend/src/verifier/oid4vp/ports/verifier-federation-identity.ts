/** The tenant's federation entity as an OID4VP verifier. */
export type VerifierFederationEntity = {
    entityId: string;
    includeTrustChain: boolean;
    /**
     * Why `entityId` is no valid Entity Identifier: a value saved before
     * EUDIPLO validated it. Requests must not use it as `client_id`.
     */
    entityIdProblem?: string;
};

/**
 * The federation identity a tenant's OID4VP requests can use with the
 * `openid_federation` client identifier prefix.
 */
export interface VerifierFederationIdentity {
    /**
     * The tenant's federation entity, or `undefined` when it takes no part in
     * a federation or does not publish `openid_credential_verifier` metadata.
     */
    forTenant(tenantId: string): Promise<VerifierFederationEntity | undefined>;
    /** Trust chain of the tenant's federation entity for the `trust_chain` header. */
    trustChain(tenantId: string): Promise<string[]>;
}

export const VERIFIER_FEDERATION_IDENTITY = Symbol(
    "VERIFIER_FEDERATION_IDENTITY",
);
