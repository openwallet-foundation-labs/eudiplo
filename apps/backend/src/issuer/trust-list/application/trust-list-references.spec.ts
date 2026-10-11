import { describe, expect, it } from "vitest";
import { TrustListReferences } from "./trust-list-references.js";

const list = { tenantId: "acme", id: "pid-issuers" };

describe("TrustListReferences", () => {
    it("collects the references of every registered source", async () => {
        const references = new TrustListReferences();
        references.register({
            findReferences: async () => [
                { kind: "PresentationConfig", id: "pid" },
            ],
        });
        references.register({ findReferences: async () => [] });
        references.register({
            findReferences: async () => [{ kind: "IssuanceConfig" }],
        });

        await expect(references.find(list)).resolves.toEqual([
            { kind: "PresentationConfig", id: "pid" },
            { kind: "IssuanceConfig" },
        ]);
    });

    it("fails when a source fails, so a list is never deleted unchecked", async () => {
        const references = new TrustListReferences();
        references.register({ findReferences: async () => [] });
        references.register({
            findReferences: async () => {
                throw new Error("database unavailable");
            },
        });

        await expect(references.find(list)).rejects.toThrow(
            "database unavailable",
        );
    });
});
