import { Injectable } from "@nestjs/common";
import type {
    FederationTrustAnchorReference,
    FederationTrustAnchorReferenceKind,
} from "../domain/federation-trust-anchor-reference.js";
import type { FederationTrustAnchorReferenceSource } from "../ports/federation-trust-anchor-reference-source.js";

/** A configuration that a change writes, with its new content. */
interface WrittenConfiguration
    extends Pick<FederationTrustAnchorReference, "kind" | "id"> {
    /** The configuration in its stored shape, such as a document `spec`. */
    content: unknown;
}

/**
 * Configurations a change, such as a configuration import, writes or removes.
 * A written configuration replaces the stored one of the same kind and ID.
 */
export interface FederationTrustAnchorConfigurationChange {
    written: WrittenConfiguration[];
    removed: Array<Pick<FederationTrustAnchorReference, "kind" | "id">>;
}

function key(
    reference: Pick<FederationTrustAnchorReference, "kind" | "id">,
): string {
    return `${reference.kind}/${reference.id ?? ""}`;
}

/**
 * Collects the configurations that name a trust anchor entity ID. The
 * features that own issuance and presentation configurations register a
 * source, so this module does not depend on them.
 */
@Injectable()
export class FederationTrustAnchorReferences {
    private readonly sources: FederationTrustAnchorReferenceSource[] = [];

    register(source: FederationTrustAnchorReferenceSource): void {
        this.sources.push(source);
    }

    async find(
        tenantId: string,
        entityId: string,
    ): Promise<FederationTrustAnchorReference[]> {
        const found = await Promise.all(
            this.sources.map((source) =>
                source.findReferences(tenantId, entityId),
            ),
        );
        return found.flat();
    }

    /**
     * The references that remain once `change` is applied: stored
     * configurations the change neither removes nor rewrites, and written
     * configurations whose new content names the entity ID.
     */
    async findAfter(
        tenantId: string,
        entityId: string,
        change: FederationTrustAnchorConfigurationChange,
    ): Promise<FederationTrustAnchorReference[]> {
        const replaced = new Set(
            [...change.written, ...change.removed].map(key),
        );
        const kept = (await this.find(tenantId, entityId)).filter(
            (reference) => !replaced.has(key(reference)),
        );
        const written = change.written
            .filter((config) =>
                this.trustAnchorIds(config.kind, config.content).includes(
                    entityId,
                ),
            )
            .map(({ kind, id }) =>
                id === undefined ? { kind } : { kind, id },
            );
        return [...kept, ...written];
    }

    /** The trust anchor entity IDs a configuration in its stored shape names. */
    trustAnchorIds(
        kind: FederationTrustAnchorReferenceKind,
        config: unknown,
    ): string[] {
        return (
            this.sources
                .find((source) => source.kind === kind)
                ?.trustAnchorIds(config) ?? []
        );
    }
}
