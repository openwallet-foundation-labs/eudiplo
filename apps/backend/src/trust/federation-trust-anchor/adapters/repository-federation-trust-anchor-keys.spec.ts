import { describe, expect, it, vi } from "vitest";
import { RepositoryFederationTrustAnchorKeys } from "./repository-federation-trust-anchor-keys.js";

describe("RepositoryFederationTrustAnchorKeys", () => {
    it("maps the tenant's registered trust anchors to their keys by entity ID", async () => {
        const key = { kty: "EC", kid: "ta-1", crv: "P-256", x: "x", y: "y" };
        const findByEntityIds = vi.fn().mockResolvedValue([
            {
                id: "ta",
                tenantId: "tenant",
                entityId: "https://ta.example.org",
                jwks: { keys: [key] },
            },
        ]);
        const keys = new RepositoryFederationTrustAnchorKeys({
            findByEntityIds,
        } as any);

        const pinned = await keys.findPinnedKeys("tenant", [
            "https://ta.example.org",
            "https://other.example.org",
        ]);

        expect(findByEntityIds).toHaveBeenCalledWith("tenant", [
            "https://ta.example.org",
            "https://other.example.org",
        ]);
        expect([...pinned]).toEqual([
            ["https://ta.example.org", { keys: [key] }],
        ]);
    });
});
