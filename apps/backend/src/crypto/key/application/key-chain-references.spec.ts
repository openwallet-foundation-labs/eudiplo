import { describe, expect, it } from "vitest";
import type {
    KeyChainReference,
    KeyChainReferenceKind,
    ReferencedKeyChain,
} from "../domain/key-chain-reference.js";
import type { KeyChainReferenceSource } from "../ports/key-chain-reference-source.js";
import { KeyChainReferences } from "./key-chain-references.js";

const keyChain = { tenantId: "acme", id: "signing" };

/** A source with stored references whose configs name the key chain through `uses`. */
function source(
    kind: KeyChainReferenceKind,
    stored: KeyChainReference[],
): KeyChainReferenceSource {
    return {
        kind,
        findReferences: async () => stored,
        namesKeyChain: (config: unknown, target: ReferencedKeyChain) =>
            (config as { uses?: string } | null)?.uses === target.id,
    };
}

describe("KeyChainReferences", () => {
    it("collects the references of every registered source", async () => {
        const references = new KeyChainReferences();
        references.register(
            source("CredentialConfig", [
                { kind: "CredentialConfig", id: "pid" },
            ]),
        );
        references.register(source("StatusList", []));
        references.register(
            source("IssuanceConfig", [{ kind: "IssuanceConfig" }]),
        );

        await expect(references.find(keyChain)).resolves.toEqual([
            { kind: "CredentialConfig", id: "pid" },
            { kind: "IssuanceConfig" },
        ]);
    });

    it("fails when a source fails, so a key chain is never deleted unchecked", async () => {
        const references = new KeyChainReferences();
        references.register({
            ...source("TrustList", []),
            findReferences: async () => {
                throw new Error("database unavailable");
            },
        });

        await expect(references.find(keyChain)).rejects.toThrow(
            "database unavailable",
        );
        await expect(
            references.findAfter(keyChain, { written: [], removed: [] }),
        ).rejects.toThrow("database unavailable");
    });

    describe("findAfter", () => {
        function registry() {
            const references = new KeyChainReferences();
            references.register(
                source("CredentialConfig", [
                    { kind: "CredentialConfig", id: "kept" },
                    { kind: "CredentialConfig", id: "removed" },
                    { kind: "CredentialConfig", id: "rewritten" },
                ]),
            );
            references.register(
                source("IssuanceConfig", [{ kind: "IssuanceConfig" }]),
            );
            references.register(source("StatusList", []));
            return references;
        }

        it("keeps stored references the change neither removes nor rewrites", async () => {
            await expect(
                registry().findAfter(keyChain, {
                    written: [
                        {
                            kind: "CredentialConfig",
                            id: "rewritten",
                            content: { uses: "other" },
                        },
                        { kind: "IssuanceConfig", content: {} },
                    ],
                    removed: [{ kind: "CredentialConfig", id: "removed" }],
                }),
            ).resolves.toEqual([{ kind: "CredentialConfig", id: "kept" }]);
        });

        it("adds written configurations whose new content names the key chain", async () => {
            await expect(
                registry().findAfter(keyChain, {
                    written: [
                        {
                            kind: "StatusList",
                            id: "new",
                            content: { uses: "signing" },
                        },
                        {
                            kind: "IssuanceConfig",
                            content: { uses: "signing" },
                        },
                    ],
                    removed: [
                        { kind: "CredentialConfig", id: "kept" },
                        { kind: "CredentialConfig", id: "removed" },
                        { kind: "CredentialConfig", id: "rewritten" },
                    ],
                }),
            ).resolves.toEqual([
                { kind: "StatusList", id: "new" },
                { kind: "IssuanceConfig" },
            ]);
        });

        it("ignores written configurations of a kind without a source", async () => {
            await expect(
                registry().findAfter(keyChain, {
                    written: [
                        {
                            kind: "TrustList",
                            id: "tl",
                            content: { uses: "signing" },
                        },
                    ],
                    removed: [
                        { kind: "CredentialConfig", id: "kept" },
                        { kind: "CredentialConfig", id: "removed" },
                        { kind: "CredentialConfig", id: "rewritten" },
                        { kind: "IssuanceConfig" },
                    ],
                }),
            ).resolves.toEqual([]);
        });
    });
});
