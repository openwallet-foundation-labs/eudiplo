import type { Repository } from "typeorm";
import { describe, expect, it } from "vitest";
import type { PresentationConfig } from "../entities/presentation-config.entity.js";
import { TypeOrmPresentationConfigFederationTrustAnchorReferences } from "./typeorm-presentation-config-federation-trust-anchor-references.js";

const source = new TypeOrmPresentationConfigFederationTrustAnchorReferences(
    {} as Repository<PresentationConfig>,
);

describe("TypeOrmPresentationConfigFederationTrustAnchorReferences", () => {
    it("reads openid_federation values of queries without etsi_tl", () => {
        expect(
            source.trustAnchorIds({
                dcql_query: {
                    credentials: [
                        {
                            trusted_authorities: [
                                {
                                    type: "openid_federation",
                                    values: ["https://ta.example.org"],
                                },
                            ],
                        },
                        {
                            trusted_authorities: [
                                {
                                    type: "openid_federation",
                                    values: ["https://other.example.org"],
                                },
                                { type: "etsi_tl", values: [{ url: "x" }] },
                            ],
                        },
                    ],
                },
            }),
        ).toEqual(["https://ta.example.org"]);
    });

    it("skips malformed import documents instead of throwing", () => {
        expect(
            source.trustAnchorIds({
                dcql_query: {
                    credentials: [
                        null,
                        { trusted_authorities: "x" },
                        { trusted_authorities: [null, 1] },
                    ],
                },
            }),
        ).toEqual([]);
        expect(source.trustAnchorIds({ dcql_query: "x" })).toEqual([]);
        expect(source.trustAnchorIds(null)).toEqual([]);
    });
});
