import { Injectable } from "@nestjs/common";
import type {
    ManagedTrustList,
    TrustListReference,
    TrustListReferenceKind,
} from "../domain/trust-list-reference.js";
import type { TrustListReferenceSource } from "../ports/trust-list-reference-source.js";

/** A configuration that a change writes, with its new content. */
interface WrittenConfiguration extends Pick<TrustListReference, "kind" | "id"> {
    /** The configuration in its stored shape, such as a document `spec`. */
    content: unknown;
}

/**
 * Configurations a change, such as a configuration import, writes or removes.
 * A written configuration replaces the stored one of the same kind and ID.
 */
export interface ConfigurationChange {
    written: WrittenConfiguration[];
    removed: Array<Pick<TrustListReference, "kind" | "id">>;
}

function key(reference: Pick<TrustListReference, "kind" | "id">): string {
    return `${reference.kind}/${reference.id ?? ""}`;
}

/**
 * Collects the configurations that reference a managed trust list. The
 * features that own presentation, credential and issuance configurations
 * register a source, so this module does not depend on them.
 */
@Injectable()
export class TrustListReferences {
    private readonly sources: TrustListReferenceSource[] = [];

    register(source: TrustListReferenceSource): void {
        this.sources.push(source);
    }

    async find(list: ManagedTrustList): Promise<TrustListReference[]> {
        const found = await Promise.all(
            this.sources.map((source) => source.findReferences(list)),
        );
        return found.flat();
    }

    /**
     * The references that remain once `change` is applied: stored
     * configurations the change neither removes nor rewrites, and written
     * configurations whose new content names the list.
     */
    async findAfter(
        list: ManagedTrustList,
        change: ConfigurationChange,
    ): Promise<TrustListReference[]> {
        const replaced = new Set(
            [...change.written, ...change.removed].map(key),
        );
        const kept = (await this.find(list)).filter(
            (reference) => !replaced.has(key(reference)),
        );
        const written = change.written
            .filter((config) =>
                this.sourceOf(config.kind)?.namesList(config.content, list),
            )
            .map(({ kind, id }) =>
                id === undefined ? { kind } : { kind, id },
            );
        return [...kept, ...written];
    }

    private sourceOf(
        kind: TrustListReferenceKind,
    ): TrustListReferenceSource | undefined {
        return this.sources.find((source) => source.kind === kind);
    }
}
