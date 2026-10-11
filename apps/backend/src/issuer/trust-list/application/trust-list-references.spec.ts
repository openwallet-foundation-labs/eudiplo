import { describe, expect, it } from "vitest";
import type {
    ManagedTrustList,
    TrustListReference,
    TrustListReferenceKind,
} from "../domain/trust-list-reference.js";
import type { TrustListReferenceSource } from "../ports/trust-list-reference-source.js";
import { TrustListReferences } from "./trust-list-references.js";

const list = { tenantId: "acme", id: "pid-issuers" };

/** A source with stored references whose configs name the list through `uses`. */
function source(
    kind: TrustListReferenceKind,
    stored: TrustListReference[],
): TrustListReferenceSource {
    return {
        kind,
        findReferences: async () => stored,
        namesList: (config: unknown, target: ManagedTrustList) =>
            (config as { uses?: string } | null)?.uses === target.id,
    };
}

describe("TrustListReferences", () => {
    it("collects the references of every registered source", async () => {
        const references = new TrustListReferences();
        references.register(
            source("PresentationConfig", [
                { kind: "PresentationConfig", id: "pid" },
            ]),
        );
        references.register(source("CredentialConfig", []));
        references.register(
            source("IssuanceConfig", [{ kind: "IssuanceConfig" }]),
        );

        await expect(references.find(list)).resolves.toEqual([
            { kind: "PresentationConfig", id: "pid" },
            { kind: "IssuanceConfig" },
        ]);
    });

    it("fails when a source fails, so a list is never deleted unchecked", async () => {
        const references = new TrustListReferences();
        references.register(source("PresentationConfig", []));
        references.register({
            ...source("CredentialConfig", []),
            findReferences: async () => {
                throw new Error("database unavailable");
            },
        });

        await expect(references.find(list)).rejects.toThrow(
            "database unavailable",
        );
        await expect(
            references.findAfter(list, { written: [], removed: [] }),
        ).rejects.toThrow("database unavailable");
    });

    describe("findAfter", () => {
        function registry() {
            const references = new TrustListReferences();
            references.register(
                source("PresentationConfig", [
                    { kind: "PresentationConfig", id: "kept" },
                    { kind: "PresentationConfig", id: "removed" },
                    { kind: "PresentationConfig", id: "rewritten" },
                ]),
            );
            references.register(
                source("IssuanceConfig", [{ kind: "IssuanceConfig" }]),
            );
            return references;
        }

        it("keeps stored references the change neither removes nor rewrites", async () => {
            await expect(
                registry().findAfter(list, {
                    written: [
                        {
                            kind: "PresentationConfig",
                            id: "rewritten",
                            content: { uses: "another-list" },
                        },
                        {
                            kind: "IssuanceConfig",
                            content: {},
                        },
                    ],
                    removed: [{ kind: "PresentationConfig", id: "removed" }],
                }),
            ).resolves.toEqual([{ kind: "PresentationConfig", id: "kept" }]);
        });

        it("adds written configurations whose new content names the list", async () => {
            await expect(
                registry().findAfter(list, {
                    written: [
                        {
                            kind: "PresentationConfig",
                            id: "new",
                            content: { uses: "pid-issuers" },
                        },
                        {
                            kind: "PresentationConfig",
                            id: "unrelated",
                            content: { uses: "pid-issuers-old" },
                        },
                        // No source registered for credential configs.
                        {
                            kind: "CredentialConfig",
                            id: "pid",
                            content: { uses: "pid-issuers" },
                        },
                    ],
                    removed: [
                        { kind: "PresentationConfig", id: "kept" },
                        { kind: "PresentationConfig", id: "removed" },
                        { kind: "PresentationConfig", id: "rewritten" },
                        { kind: "IssuanceConfig" },
                    ],
                }),
            ).resolves.toEqual([{ kind: "PresentationConfig", id: "new" }]);
        });

        it("reports a rewritten issuance configuration once, without ID", async () => {
            await expect(
                registry().findAfter(list, {
                    written: [
                        {
                            kind: "IssuanceConfig",
                            content: { uses: "pid-issuers" },
                        },
                    ],
                    removed: [],
                }),
            ).resolves.toEqual([
                { kind: "PresentationConfig", id: "kept" },
                { kind: "PresentationConfig", id: "removed" },
                { kind: "PresentationConfig", id: "rewritten" },
                { kind: "IssuanceConfig" },
            ]);
        });
    });
});
