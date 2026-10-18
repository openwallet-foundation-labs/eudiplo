import { describe, expect, it } from "vitest";
import { CreateFederationTrustAnchorSchema } from "./federation-trust-anchor.schema.js";

const key = (kid: string, extra: Record<string, unknown> = {}) => ({
    kty: "EC",
    kid,
    crv: "P-256",
    x: "x",
    y: "y",
    ...extra,
});

const anchor = (overrides: Record<string, unknown> = {}) => ({
    id: "ta",
    entityId: "https://ta.example.org",
    jwks: { keys: [key("ta-1")] },
    ...overrides,
});

/** Paths of the issues, joined with dots. */
function issuePaths(input: unknown): string[] {
    const result = CreateFederationTrustAnchorSchema.safeParse(input);
    return result.success
        ? []
        : result.error.issues.map((issue) => issue.path.join("."));
}

describe("CreateFederationTrustAnchorSchema", () => {
    it("accepts public keys with unique kids", () => {
        expect(issuePaths(anchor())).toEqual([]);
    });

    it.each([
        ["a duplicate kid", { keys: [key("a"), key("a")] }, "jwks.keys.1.kid"],
        [
            "an EC key without y",
            { keys: [key("a", { y: undefined })] },
            "jwks.keys.0.y",
        ],
        [
            "an RSA key without e",
            { keys: [{ kty: "RSA", kid: "a", n: "n" }] },
            "jwks.keys.0.e",
        ],
        [
            "a symmetric key",
            { keys: [key("a", { k: "secret" })] },
            "jwks.keys.0.k",
        ],
        ["other primes", { keys: [key("a", { oth: [] })] }, "jwks.keys.0.oth"],
        [
            "more than 20 keys",
            { keys: Array.from({ length: 21 }, (_, i) => key(`k${i}`)) },
            "jwks.keys",
        ],
        [
            "an oversized key",
            { keys: [key("a", { x5c: ["a".repeat(9000)] })] },
            "jwks.keys.0",
        ],
    ])("rejects %s", (_name, jwks, path) => {
        expect(issuePaths(anchor({ jwks }))).toContain(path);
    });

    it.each([
        "https://ta.example.org#fragment",
        "https://ta.example.org?query",
        "http://ta.example.org",
        "not a url",
    ])("rejects the entity ID %s", (entityId) => {
        expect(issuePaths(anchor({ entityId }))).toContain("entityId");
    });

    it("rejects an id that is not usable as a file name", () => {
        expect(issuePaths(anchor({ id: "../ta" }))).toContain("id");
    });
});
