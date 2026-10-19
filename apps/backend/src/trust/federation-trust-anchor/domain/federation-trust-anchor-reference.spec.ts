import { describe, expect, it } from "vitest";
import {
    describeFederationTrustAnchorReferences,
    federationTrustAnchorInUseMessage,
    federationTrustAnchorReferencesVisibleTo,
} from "./federation-trust-anchor-reference.js";

describe("federation trust anchor references", () => {
    it("names presentation configs and the issuance configuration", () => {
        expect(
            federationTrustAnchorInUseMessage(
                "eu",
                "https://ta.example.org",
                "delete",
                [
                    { kind: "IssuanceConfig" },
                    { kind: "PresentationConfig", id: "pid" },
                ],
            ),
        ).toBe(
            'Federation trust anchor "eu" (https://ta.example.org) is still named by 1 presentation config ("pid") and the issuance configuration (federation.trustAnchors). Remove these references before deleting it.',
        );
        expect(
            federationTrustAnchorInUseMessage(
                "eu",
                "https://ta.example.org",
                "change-entity-id",
                [{ kind: "IssuanceConfig" }],
            ),
        ).toContain("before changing its entity ID");
    });

    it("names at most five presentation configs", () => {
        const references = ["a", "b", "c", "d", "e", "f", "g"].map((id) => ({
            kind: "PresentationConfig" as const,
            id,
        }));
        expect(describeFederationTrustAnchorReferences(references)).toBe(
            '7 presentation configs ("a", "b", "c", "d", "e" and 2 more)',
        );
    });

    it("only counts configurations the caller may not read, with the roles that show them", () => {
        const visible = federationTrustAnchorReferencesVisibleTo(
            [
                {
                    kind: "PresentationConfig",
                    id: "pid",
                    description: "PID",
                },
                { kind: "IssuanceConfig" },
            ],
            (kind) => kind === "IssuanceConfig",
        );

        expect(visible).toEqual([
            { kind: "PresentationConfig" },
            { kind: "IssuanceConfig" },
        ]);
        expect(
            describeFederationTrustAnchorReferences(visible, () => [
                "presentation:manage",
            ]),
        ).toBe(
            "1 presentation config (presentation:manage shows which) and the issuance configuration (federation.trustAnchors)",
        );
    });
});
