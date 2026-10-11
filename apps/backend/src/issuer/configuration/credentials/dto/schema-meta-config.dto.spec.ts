import { describe, expect, it } from "vitest";
import {
    SchemaMetaConfig,
    SignSchemaMetaConfigDto,
    SignVersionSchemaMetaConfigDto,
} from "./schema-meta-config.dto.js";

const config = {
    name: "German PID",
    version: "1.0.0",
    rulebookURI: "https://example.com/rulebook.md",
    attestationLoS: "iso_18045_high",
    bindingType: "key",
};

describe.each([
    ["publish", SignSchemaMetaConfigDto],
    ["publish-version", SignVersionSchemaMetaConfigDto],
])("%s body", (_endpoint, dto) => {
    it("accepts registrar category and tags", () => {
        const result = dto.schema.safeParse({
            config: { ...config, category: "identity", tags: ["pid", "eudi"] },
        });

        expect(result.success).toBe(true);
    });

    it("rejects a category outside the registrar vocabulary", () => {
        const result = dto.schema.safeParse({
            config: { ...config, category: "gaming" },
        });

        expect(result.error?.issues[0]).toMatchObject({
            code: "invalid_value",
            path: ["config", "category"],
        });
    });

    it("rejects a tag outside the registrar vocabulary", () => {
        const result = dto.schema.safeParse({
            config: { ...config, tags: ["pid", "loyalty"] },
        });

        expect(result.error?.issues[0]).toMatchObject({
            code: "invalid_value",
            path: ["config", "tags", 1],
        });
    });

    it("still rejects unknown fields", () => {
        const result = dto.schema.safeParse({
            config: { ...config, colour: "blue" },
        });

        expect(result.error?.issues[0]).toMatchObject({
            code: "unrecognized_keys",
            path: ["config"],
        });
    });
});

describe("SchemaMetaConfig", () => {
    it("does not accept the registrar catalogue fields", () => {
        const result = SchemaMetaConfig.schema.safeParse({
            ...config,
            category: "identity",
            tags: ["pid"],
        });

        expect(result.error?.issues[0]).toMatchObject({
            code: "unrecognized_keys",
            keys: ["category", "tags"],
        });
    });
});
