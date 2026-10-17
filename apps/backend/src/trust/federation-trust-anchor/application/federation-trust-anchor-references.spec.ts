import { describe, expect, it } from "vitest";
import type {
    FederationTrustAnchorReference,
    FederationTrustAnchorReferenceKind,
} from "../domain/federation-trust-anchor-reference.js";
import type { FederationTrustAnchorReferenceSource } from "../ports/federation-trust-anchor-reference-source.js";
import { FederationTrustAnchorReferences } from "./federation-trust-anchor-references.js";

const entityId = "https://ta.example.org";

/** A source returning `stored`; a written config names the entity IDs in its `anchors`. */
function source(
    kind: FederationTrustAnchorReferenceKind,
    stored: FederationTrustAnchorReference[],
): FederationTrustAnchorReferenceSource {
    return {
        kind,
        findReferences: async () => stored,
        trustAnchorIds: (config: unknown) =>
            (config as { anchors?: string[] } | null)?.anchors ?? [],
    };
}

function registry() {
    const references = new FederationTrustAnchorReferences();
    references.register(
        source("PresentationConfig", [
            { kind: "PresentationConfig", id: "pid" },
            { kind: "PresentationConfig", id: "age" },
        ]),
    );
    references.register(source("IssuanceConfig", [{ kind: "IssuanceConfig" }]));
    return references;
}

describe("FederationTrustAnchorReferences", () => {
    it("collects the references of every registered source", async () => {
        await expect(registry().find("acme", entityId)).resolves.toEqual([
            { kind: "PresentationConfig", id: "pid" },
            { kind: "PresentationConfig", id: "age" },
            { kind: "IssuanceConfig" },
        ]);
    });

    it("fails when a source fails, so an anchor is never deleted unchecked", async () => {
        const references = registry();
        references.register({
            ...source("PresentationConfig", []),
            findReferences: async () => {
                throw new Error("database unavailable");
            },
        });

        await expect(references.find("acme", entityId)).rejects.toThrow(
            "database unavailable",
        );
    });

    it("leaves out removed and rewritten configurations and checks written content", async () => {
        const after = await registry().findAfter("acme", entityId, {
            written: [
                // Rewritten without the anchor.
                { kind: "PresentationConfig", id: "pid", content: {} },
                // New and naming the anchor.
                {
                    kind: "PresentationConfig",
                    id: "new",
                    content: { anchors: [entityId] },
                },
                // Rewritten, still naming the anchor.
                { kind: "IssuanceConfig", content: { anchors: [entityId] } },
            ],
            removed: [{ kind: "PresentationConfig", id: "age" }],
        });

        expect(after).toEqual([
            { kind: "PresentationConfig", id: "new" },
            { kind: "IssuanceConfig" },
        ]);
    });

    it("reads the entity IDs of a configuration through the source of its kind", () => {
        expect(
            registry().trustAnchorIds("IssuanceConfig", {
                anchors: [entityId],
            }),
        ).toEqual([entityId]);
        expect(
            new FederationTrustAnchorReferences().trustAnchorIds(
                "IssuanceConfig",
                { anchors: [entityId] },
            ),
        ).toEqual([]);
    });
});
