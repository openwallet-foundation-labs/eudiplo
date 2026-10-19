import type {
    FederationTrustAnchorReference,
    FederationTrustAnchorReferenceKind,
} from "../domain/federation-trust-anchor-reference.js";

/**
 * Finds the configurations of one kind that name a trust anchor entity ID.
 * Implemented by the feature that owns the configuration, which registers it
 * with `FederationTrustAnchorReferences`.
 */
export interface FederationTrustAnchorReferenceSource {
    /** The kind of configuration this source reads. */
    readonly kind: FederationTrustAnchorReferenceKind;

    /** Configurations of the tenant that name the entity ID. */
    findReferences(
        tenantId: string,
        entityId: string,
    ): Promise<FederationTrustAnchorReference[]>;

    /**
     * The trust anchor entity IDs a configuration of this kind, in its stored
     * shape (the `spec` of a configuration document), needs registered. Used
     * for configurations that are not stored yet, such as the documents of a
     * configuration import.
     */
    trustAnchorIds(config: unknown): string[];
}
