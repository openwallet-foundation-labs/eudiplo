import { describe, expect, it } from "vitest";
import {
    SchemaMetaConfigSchema,
    SignSchemaMetaConfigSchema,
    SignVersionSchemaMetaConfigSchema,
} from "./schema-meta-config.schema.js";

const config = {
    version: "1.0.0",
    rulebookURI: "https://example.com/rulebook.md",
    attestationLoS: "iso_18045_high",
    bindingType: "key",
    name: "German PID",
};

describe("SignSchemaMetaConfigSchema", () => {
    it("accepts the required values with a name and rulebook", () => {
        expect(SignSchemaMetaConfigSchema.safeParse({ config }).success).toBe(
            true,
        );
    });

    it("rejects unknown fields", () => {
        const result = SignSchemaMetaConfigSchema.safeParse({
            config: { ...config, colour: "blue" },
        });

        expect(result.error?.issues[0]).toMatchObject({
            code: "unrecognized_keys",
            path: ["config"],
        });
    });
});

describe.each([
    ["publish", SignSchemaMetaConfigSchema],
    ["publish-version", SignVersionSchemaMetaConfigSchema],
])("%s body registrar catalogue fields", (_endpoint, schema) => {
    it("accepts a category and tags", () => {
        const result = schema.safeParse({
            config: { ...config, category: "identity", tags: ["pid", "eudi"] },
        });

        expect(result.success).toBe(true);
    });

    it("rejects a category outside the registrar vocabulary", () => {
        const result = schema.safeParse({
            config: { ...config, category: "gaming" },
        });

        expect(result.error?.issues[0]).toMatchObject({
            code: "invalid_value",
            path: ["config", "category"],
        });
    });

    it("rejects repeated tags", () => {
        const result = schema.safeParse({
            config: { ...config, tags: ["pid", "pid"] },
        });

        expect(result.error?.issues[0]).toMatchObject({
            path: ["config", "tags"],
            message: "tags must not repeat",
        });
    });

    it("rejects a tag outside the registrar vocabulary", () => {
        const result = schema.safeParse({
            config: { ...config, tags: ["pid", "loyalty"] },
        });

        expect(result.error?.issues[0]).toMatchObject({
            code: "invalid_value",
            path: ["config", "tags", 1],
        });
    });
});

describe("SchemaMetaConfigSchema", () => {
    it("does not accept the registrar catalogue fields", () => {
        const result = SchemaMetaConfigSchema.safeParse({
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
