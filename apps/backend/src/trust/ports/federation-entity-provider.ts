/**
 * What a locally signed entity configuration states about the tenant's
 * federation entity. The metadata is built from the existing issuer and
 * verifier configuration; the federation keys come from the key chain.
 */
export type EntityConfigurationContent = {
    authorityHints: string[];
    metadata: Record<string, Record<string, unknown>>;
    /** Trust mark JWTs issued to the entity. */
    trustMarks: string[];
    lifetimeSeconds: number;
};

export type EntityConfigurationRequest = {
    tenantId: string;
    /** Entity identifier: `iss` and `sub` of the entity configuration. */
    entityId: string;
    /** Key chain with usage type `federation` for local signing; a tenant default when unset. */
    keyChainId?: string;
    /**
     * Builds the content for a locally signed entity configuration. Only
     * called by providers that sign it themselves.
     */
    content: () => Promise<EntityConfigurationContent>;
};

/** The entity configuration could not be obtained, for example from a trust engine. */
export class FederationEntityUnavailableError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "FederationEntityUnavailableError";
    }
}

/**
 * Supplies the signed entity configuration (`application/entity-statement+jwt`)
 * of a tenant's own federation entity, either signed by EUDIPLO or obtained
 * unchanged from an external trust engine. Callers do not need to know which.
 */
export interface FederationEntityProvider {
    getEntityConfiguration(
        request: EntityConfigurationRequest,
    ): Promise<string>;
}

export const FEDERATION_ENTITY_PROVIDER = Symbol("FEDERATION_ENTITY_PROVIDER");
