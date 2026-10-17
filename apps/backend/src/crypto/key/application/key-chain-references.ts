import { Injectable } from "@nestjs/common";
import type {
    KeyChainReference,
    KeyChainReferenceKind,
    ReferencedKeyChain,
} from "../domain/key-chain-reference.js";
import type { KeyChainReferenceSource } from "../ports/key-chain-reference-source.js";

/** A configuration that a change writes, with its new content. */
interface WrittenConfiguration extends Pick<KeyChainReference, "kind" | "id"> {
    /** The configuration in its stored shape, such as a document `spec`. */
    content: unknown;
}

/**
 * Configurations a change, such as a configuration import, writes or removes.
 * A written configuration replaces the stored one of the same kind and ID.
 */
export interface KeyChainConfigurationChange {
    written: WrittenConfiguration[];
    removed: Array<Pick<KeyChainReference, "kind" | "id">>;
}

function key(reference: Pick<KeyChainReference, "kind" | "id">): string {
    return `${reference.kind}/${reference.id ?? ""}`;
}

/**
 * Collects the configurations that name a key chain. The features that own
 * issuance, credential and presentation configurations, status lists and
 * trust lists register a source, so the key module does not depend on them.
 */
@Injectable()
export class KeyChainReferences {
    private readonly sources: KeyChainReferenceSource[] = [];

    register(source: KeyChainReferenceSource): void {
        this.sources.push(source);
    }

    async find(keyChain: ReferencedKeyChain): Promise<KeyChainReference[]> {
        const found = await Promise.all(
            this.sources.map((source) => source.findReferences(keyChain)),
        );
        return found.flat();
    }

    /**
     * The references that remain once `change` is applied: stored
     * configurations the change neither removes nor rewrites, and written
     * configurations whose new content names the key chain.
     */
    async findAfter(
        keyChain: ReferencedKeyChain,
        change: KeyChainConfigurationChange,
    ): Promise<KeyChainReference[]> {
        const replaced = new Set(
            [...change.written, ...change.removed].map(key),
        );
        const kept = (await this.find(keyChain)).filter(
            (reference) => !replaced.has(key(reference)),
        );
        const written = change.written
            .filter((config) =>
                this.sourceOf(config.kind)?.namesKeyChain(
                    config.content,
                    keyChain,
                ),
            )
            .map(({ kind, id }) =>
                id === undefined ? { kind } : { kind, id },
            );
        return [...kept, ...written];
    }

    private sourceOf(
        kind: KeyChainReferenceKind,
    ): KeyChainReferenceSource | undefined {
        return this.sources.find((source) => source.kind === kind);
    }
}
