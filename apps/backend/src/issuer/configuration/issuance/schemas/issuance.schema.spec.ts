import { describe, expect, it } from "vitest";
import { REMOVED_CHAINED_VP_MESSAGE } from "../domain/removed-authorization-servers.js";
import { IssuanceConfigSchema } from "./issuance.schema.js";

describe("IssuanceConfigSchema", () => {
    it("rejects the removed 'vp' option with a pointer to the oid4vp type", () => {
        const result = IssuanceConfigSchema.safeParse({
            authorizationServers: [
                {
                    type: "chained",
                    id: "legacy-vp",
                    upstream: {
                        issuer: "https://idp.example",
                        clientId: "eudiplo",
                    },
                    vp: { enabled: true, presentationConfigId: "pid" },
                },
            ],
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toContainEqual(
            expect.objectContaining({
                code: "unrecognized_keys",
                message: REMOVED_CHAINED_VP_MESSAGE,
            }),
        );
    });

    it("keeps the generic message for other unknown keys", () => {
        const result = IssuanceConfigSchema.safeParse({
            authorizationServers: [
                {
                    type: "chained",
                    id: "chained",
                    upstream: {
                        issuer: "https://idp.example",
                        clientId: "eudiplo",
                    },
                    unknown: true,
                },
            ],
        });

        expect(result.error?.issues).toContainEqual(
            expect.objectContaining({ code: "unrecognized_keys" }),
        );
        expect(JSON.stringify(result.error?.issues)).not.toContain("oid4vp");
    });

    it.each([
        [{ role: "trust_anchor" }, ["federation", "role"]],
        [
            { enforceSigningPolicy: false },
            ["federation", "enforceSigningPolicy"],
        ],
    ])("rejects the unsupported federation option %o", (option, path) => {
        const result = IssuanceConfigSchema.safeParse({
            authorizationServers: [{ type: "built-in", id: "built-in" }],
            federation: {
                trustAnchors: [
                    {
                        entityId: "https://ta.example.org",
                        entityConfigurationUri:
                            "https://ta.example.org/.well-known/openid-federation",
                    },
                ],
                ...option,
            },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toContainEqual(
            expect.objectContaining({ code: "custom", path }),
        );
    });

    it("accepts the leaf role with an enforced signing policy", () => {
        const result = IssuanceConfigSchema.safeParse({
            authorizationServers: [{ type: "built-in", id: "built-in" }],
            federation: {
                role: "leaf",
                enforceSigningPolicy: true,
                trustAnchors: [
                    {
                        entityId: "https://ta.example.org",
                        entityConfigurationUri:
                            "https://ta.example.org/.well-known/openid-federation",
                    },
                ],
            },
        });

        expect(result.error?.issues).toBeUndefined();
    });

    describe("trust-list verifierKeyPem", () => {
        const pem =
            "-----BEGIN PUBLIC KEY-----\nMFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE\n-----END PUBLIC KEY-----";
        const parse = (verifierKeyPem: string) =>
            IssuanceConfigSchema.safeParse({
                authorizationServers: [
                    {
                        type: "built-in",
                        id: "built-in",
                        walletProviderTrustLists: [
                            { url: "https://trust.example/as", verifierKeyPem },
                        ],
                    },
                ],
                walletProviderTrustLists: [
                    { url: "https://trust.example/shared", verifierKeyPem },
                ],
            });

        it("accepts a PEM public key as the only verifier and trims it", () => {
            const result = parse(`\n${pem}\n`);

            expect(result.error?.issues).toBeUndefined();
            expect(result.data?.walletProviderTrustLists?.[0]).toEqual({
                url: "https://trust.example/shared",
                verifierKeyPem: pem,
            });
        });

        it("rejects a PEM block that is not a public key", () => {
            const result = parse(
                "-----BEGIN PRIVATE KEY-----\nMIGHAgEA\n-----END PRIVATE KEY-----",
            );

            expect(result.success).toBe(false);
            expect(
                result.error?.issues.map((issue) => issue.path.join(".")),
            ).toEqual(
                expect.arrayContaining([
                    "walletProviderTrustLists.0.verifierKeyPem",
                    "authorizationServers.0.walletProviderTrustLists.0.verifierKeyPem",
                ]),
            );
        });
    });

    describe("federation entity fields", () => {
        const b64 = (value: unknown) =>
            Buffer.from(JSON.stringify(value)).toString("base64url");
        const parse = (fields: Record<string, unknown>) =>
            IssuanceConfigSchema.safeParse({
                authorizationServers: [{ type: "built-in", id: "issuer" }],
                federation: {
                    entityId: "https://issuer.example.org",
                    trustAnchors: [
                        {
                            entityId: "https://ta.example.org",
                            entityConfigurationUri:
                                "https://ta.example.org/.well-known/openid-federation",
                        },
                    ],
                    ...fields,
                },
            });

        it("accepts the entity configuration settings within their bounds", () => {
            for (const lifetime of [60, 31536000]) {
                expect(
                    parse({
                        entityTypes: ["openid_credential_verifier"],
                        authorityHints: ["https://intermediate.example.org"],
                        entityConfigurationLifetimeSeconds: lifetime,
                        trustMarks: [
                            `${b64({ alg: "ES256" })}.${b64({ trust_mark_type: "https://ta.example.org/marks/x" })}.c2ln`,
                        ],
                        entityMetadata: {
                            organization_name: "Example",
                            homepage_uri: "https://example.org",
                        },
                        includeTrustChain: true,
                    }).success,
                ).toBe(true);
            }
        });

        it.each([
            ["no entity type", { entityTypes: [] }],
            ["an unknown entity type", { entityTypes: ["openid_provider"] }],
            ["an authority hint that is no URL", { authorityHints: ["ta"] }],
            [
                "a lifetime below a minute",
                { entityConfigurationLifetimeSeconds: 59 },
            ],
            [
                "a lifetime above a year",
                { entityConfigurationLifetimeSeconds: 31536001 },
            ],
            [
                "a trust mark without trust_mark_type",
                { trustMarks: ["a.e30.c2ln"] },
            ],
            ["a trust mark that is no JWT", { trustMarks: ["not-a-jwt"] }],
            [
                "unknown federation_entity metadata",
                { entityMetadata: { federation_fetch_endpoint: "https://x" } },
            ],
        ])("rejects %s", (_case, fields) => {
            expect(parse(fields).success).toBe(false);
        });
    });
});
