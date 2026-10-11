import type {
    ManagedTrustList,
    TrustListReference,
} from "../domain/trust-list-reference.js";

/**
 * Finds the configurations of one kind that reference a managed trust list.
 * Implemented by the feature that owns the configuration, which registers it
 * with `TrustListReferences`.
 */
export interface TrustListReferenceSource {
    /** References from configurations of the list's tenant only. */
    findReferences(list: ManagedTrustList): Promise<TrustListReference[]>;
}
