import type {
    ManagedTrustList,
    TrustListReference,
    TrustListReferenceKind,
} from "../domain/trust-list-reference.js";

/**
 * Finds the configurations of one kind that reference a managed trust list.
 * Implemented by the feature that owns the configuration, which registers it
 * with `TrustListReferences`.
 */
export interface TrustListReferenceSource {
    /** The kind of configuration this source reads. */
    readonly kind: TrustListReferenceKind;

    /** References from configurations of the list's tenant only. */
    findReferences(list: ManagedTrustList): Promise<TrustListReference[]>;

    /**
     * True when a configuration of this kind, in its stored shape (the `spec`
     * of a configuration document), names the list. Used for configurations
     * that are not stored yet, such as the documents of a configuration import.
     */
    namesList(config: unknown, list: ManagedTrustList): boolean;
}
