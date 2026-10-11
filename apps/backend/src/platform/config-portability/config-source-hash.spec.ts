import { schemaUrl } from "@eudiplo/config-format/config-format.js";
import { describe, expect, it } from "vitest";
import type { ConfigDocument } from "./config-resource.types.js";
import {
    documentAppliedAsIs,
    documentSourceHash,
} from "./config-source-hash.js";

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

describe("documents applied as they are", () => {
    const keyChain: ConfigDocument = {
        $schema: schemaUrl("KeyChain"),
        kind: "KeyChain",
        metadata: { generation: 1 },
        spec: { id: "issuer", keySource: { type: "regenerate" } },
    };
    const client = (secret: string): ConfigDocument => ({
        $schema: schemaUrl("Client"),
        kind: "Client",
        metadata: { generation: 1 },
        spec: { clientId: "app", secret, roles: ["issuance:offer"] },
    });
    const applied = (
        document: ConfigDocument,
        overrides: Record<string, unknown> = {},
    ) => ({
        ownership: "file-managed" as const,
        source: "folder:/config/demo",
        sourceHash: documentSourceHash(document),
        ...overrides,
    });

    it("skips the comparison for the key chain or generated-secret client a source last applied", () => {
        for (const document of [keyChain, client("!generate")])
            expect(
                documentAppliedAsIs(
                    document,
                    applied(document),
                    "folder:/config/demo",
                ),
            ).toBe(true);
    });

    it("compares other documents, ownership and sources", () => {
        const withSecret = client("app-secret");
        expect(
            documentAppliedAsIs(
                withSecret,
                applied(withSecret),
                "folder:/config/demo",
            ),
        ).toBe(false);
        for (const ownership of ["detached", "unmanaged"])
            expect(
                documentAppliedAsIs(
                    keyChain,
                    applied(keyChain, { ownership }),
                    "folder:/config/demo",
                ),
            ).toBe(false);
        expect(
            documentAppliedAsIs(keyChain, applied(keyChain), "bundle:demo"),
        ).toBe(false);
        expect(
            documentAppliedAsIs(
                keyChain,
                applied(keyChain, { sourceHash: "other" }),
                "folder:/config/demo",
            ),
        ).toBe(false);
    });
});
