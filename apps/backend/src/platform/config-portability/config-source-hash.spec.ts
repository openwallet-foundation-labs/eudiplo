import { describe, expect, it } from "vitest";
import { documentSourceHash } from "./config-source-hash.js";

describe("documentSourceHash", () => {
    // Earlier releases stored this hash. Another value makes every
    // file-managed key chain plan `update` once and get new keys.
    it("keeps the hash that earlier releases stored", () => {
        expect(
            documentSourceHash({
                $schema:
                    "https://eudiplo.dev/schemas/v1/KeyChainConfigFile.schema.json",
                kind: "KeyChain",
                metadata: { generation: 1 },
                spec: {
                    id: "issuer",
                    usageType: "attestation",
                    keySource: { type: "regenerate" },
                },
            }),
        ).toBe(
            "4991ae57c3a02ca473728646e5fe92fbcd13d41119a6afd2f9436d316087badc",
        );
    });
});
