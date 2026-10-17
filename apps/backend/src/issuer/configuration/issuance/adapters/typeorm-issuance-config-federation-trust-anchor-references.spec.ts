import type { Repository } from "typeorm";
import { describe, expect, it } from "vitest";
import type { IssuanceConfig } from "../entities/issuance-config.entity.js";
import { TypeOrmIssuanceConfigFederationTrustAnchorReferences } from "./typeorm-issuance-config-federation-trust-anchor-references.js";

const entityId = "https://ta.example.org";
const config = {
    tenantId: "acme",
    federation: {
        trustAnchors: [
            { entityId, entityConfigurationUri: `${entityId}/.well-known` },
        ],
    },
};

function source(stored: unknown) {
    return new TypeOrmIssuanceConfigFederationTrustAnchorReferences({
        findOne: async () => stored,
    } as unknown as Repository<IssuanceConfig>);
}

describe("TypeOrmIssuanceConfigFederationTrustAnchorReferences", () => {
    it("names the issuance configuration when federation.trustAnchors has the entity ID", async () => {
        await expect(
            source(config).findReferences("acme", entityId),
        ).resolves.toEqual([{ kind: "IssuanceConfig" }]);
        await expect(
            source(config).findReferences("acme", "https://other.example.org"),
        ).resolves.toEqual([]);
        await expect(
            source(null).findReferences("acme", entityId),
        ).resolves.toEqual([]);
    });

    it("reads entity IDs of malformed documents without throwing", () => {
        const ids = source(null);
        expect(ids.trustAnchorIds(config)).toEqual([entityId]);
        expect(ids.trustAnchorIds({ federation: null })).toEqual([]);
        expect(
            ids.trustAnchorIds({ federation: { trustAnchors: "x" } }),
        ).toEqual([]);
        expect(
            ids.trustAnchorIds({
                federation: { trustAnchors: [null, { entityId: 1 }] },
            }),
        ).toEqual([]);
        expect(ids.trustAnchorIds(null)).toEqual([]);
    });
});
