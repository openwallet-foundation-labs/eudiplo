/** Resolves the issuer identity used by credential formats. */
export interface IssuerFederationContext {
    entityIdForTenant(tenantId: string): Promise<string | undefined>;
    /**
     * Trust chain of the tenant's federation entity for the `trust_chain`
     * header, or `undefined` when it is not configured to be included.
     */
    trustChainForTenant(tenantId: string): Promise<string[] | undefined>;
}
export const ISSUER_FEDERATION_CONTEXT = Symbol("ISSUER_FEDERATION_CONTEXT");
