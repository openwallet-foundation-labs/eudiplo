/** Default lifetime (exp - iat) of a published entity configuration. */
const DEFAULT_ENTITY_CONFIGURATION_LIFETIME_SECONDS = 86400;

/** Metadata types the entity configuration of a tenant can publish. */
export const FEDERATION_ENTITY_TYPES = [
    "openid_credential_issuer",
    "openid_credential_verifier",
] as const;

type FederationEntityTypeName = (typeof FEDERATION_ENTITY_TYPES)[number];

/** The `federation` block of an issuance configuration, as far as it is read here. */
export type FederationEntityConfig = {
    entityId?: string | null;
    trustAnchors?: { entityId: string }[] | null;
    entityTypes?: FederationEntityTypeName[] | null;
    authorityHints?: string[] | null;
    entityKeyChainId?: string | null;
    entityConfigurationLifetimeSeconds?: number | null;
    trustMarks?: string[] | null;
    entityMetadata?: Record<string, unknown> | null;
    includeTrustChain?: boolean | null;
};

/** The tenant's own federation entity, with defaults applied. */
export type OwnFederationEntity = {
    entityId: string;
    entityTypes: FederationEntityTypeName[];
    authorityHints: string[];
    keyChainId?: string;
    lifetimeSeconds: number;
    trustMarks: string[];
    entityMetadata: Record<string, unknown>;
    includeTrustChain: boolean;
};

/**
 * The tenant's own federation entity, or `undefined` when the tenant takes
 * no part in a federation: that needs an entity id and at least one trust
 * anchor. Without authority hints the entity is a direct subordinate of its
 * trust anchors.
 */
export function ownFederationEntity(
    federation: FederationEntityConfig | null | undefined,
): OwnFederationEntity | undefined {
    const trustAnchors = federation?.trustAnchors ?? [];
    if (!federation?.entityId || trustAnchors.length === 0) return undefined;
    return {
        entityId: federation.entityId,
        entityTypes: federation.entityTypes?.length
            ? [...new Set(federation.entityTypes)]
            : ["openid_credential_issuer"],
        authorityHints: federation.authorityHints?.length
            ? federation.authorityHints
            : trustAnchors.map((anchor) => anchor.entityId),
        keyChainId: federation.entityKeyChainId ?? undefined,
        lifetimeSeconds:
            federation.entityConfigurationLifetimeSeconds ??
            DEFAULT_ENTITY_CONFIGURATION_LIFETIME_SECONDS,
        trustMarks: federation.trustMarks ?? [],
        entityMetadata: federation.entityMetadata ?? {},
        includeTrustChain: federation.includeTrustChain ?? false,
    };
}

/**
 * Trust chain of the tenant's own federation entity, resolved to its trust
 * anchors with `resolve` (`FederationTrustService.resolveEntity`).
 *
 * @throws Error when the tenant has no federation entity
 */
export async function ownTrustChain(
    federation: FederationEntityConfig | null | undefined,
    resolve: (
        entityId: string,
        source: FederationEntityConfig,
    ) => Promise<{ trustChain: string[] }>,
): Promise<string[]> {
    const entity = ownFederationEntity(federation);
    if (!entity || !federation) {
        throw new Error("The tenant has no OpenID Federation entity");
    }
    return (await resolve(entity.entityId, federation)).trustChain;
}
