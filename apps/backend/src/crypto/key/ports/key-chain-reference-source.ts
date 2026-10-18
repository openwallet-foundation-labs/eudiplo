import type {
    KeyChainReference,
    KeyChainReferenceKind,
    ReferencedKeyChain,
} from "../domain/key-chain-reference.js";

/**
 * Finds the configurations of one kind that name a key chain. Implemented by
 * the feature that owns the configuration, which registers it with
 * `KeyChainReferences`.
 */
export interface KeyChainReferenceSource {
    /** The kind of configuration this source reads. */
    readonly kind: KeyChainReferenceKind;

    /** References from configurations of the key chain's tenant only. */
    findReferences(keyChain: ReferencedKeyChain): Promise<KeyChainReference[]>;

    /**
     * True when a configuration of this kind, in its stored shape (the `spec`
     * of a configuration document), names the key chain. Used for
     * configurations that are not stored yet, such as the documents of a
     * configuration import.
     */
    namesKeyChain(config: unknown, keyChain: ReferencedKeyChain): boolean;
}
