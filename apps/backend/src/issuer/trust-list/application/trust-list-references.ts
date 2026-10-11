import { Injectable } from "@nestjs/common";
import type {
    ManagedTrustList,
    TrustListReference,
} from "../domain/trust-list-reference.js";
import type { TrustListReferenceSource } from "../ports/trust-list-reference-source.js";

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
}
