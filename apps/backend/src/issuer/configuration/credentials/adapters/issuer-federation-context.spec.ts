import { describe, expect, it, vi } from "vitest";
import { ConfiguredIssuerFederationContext } from "./issuer-federation-context.js";

const federation = (extra: Record<string, unknown> = {}) => ({
    entityId: "https://issuer.example.org/issuers/tenant",
    trustAnchors: [
        {
            entityId: "https://ta.example.org",
            entityConfigurationUri:
                "https://ta.example.org/.well-known/openid-federation",
        },
    ],
    ...extra,
});

function context(config: Record<string, unknown>) {
    const trust = {
        isEnabled: vi.fn(
            (source?: { trustAnchors?: unknown[] }) =>
                !!source?.trustAnchors?.length,
        ),
        resolveEntity: vi
            .fn()
            .mockResolvedValue({ trustChain: ["ec", "statement", "ta"] }),
    };
    return {
        trust,
        context: new ConfiguredIssuerFederationContext(
            {
                getIssuanceConfiguration: vi.fn().mockResolvedValue(config),
            } as never,
            trust as never,
        ),
    };
}

describe("ConfiguredIssuerFederationContext", () => {
    it("resolves the tenant's own trust chain when includeTrustChain is set", async () => {
        const { context: ctx, trust } = context({
            federation: federation({ includeTrustChain: true }),
        });

        await expect(ctx.trustChainForTenant("tenant")).resolves.toEqual([
            "ec",
            "statement",
            "ta",
        ]);
        expect(trust.resolveEntity).toHaveBeenCalledWith(
            "https://issuer.example.org/issuers/tenant",
            expect.objectContaining({
                includeTrustChain: true,
                tenantId: "tenant",
            }),
        );
    });

    it("adds no trust chain unless configured", async () => {
        const { context: ctx, trust } = context({ federation: federation() });

        await expect(
            ctx.trustChainForTenant("tenant"),
        ).resolves.toBeUndefined();
        expect(trust.resolveEntity).not.toHaveBeenCalled();
    });

    it("fails when the configured trust chain cannot be resolved", async () => {
        const { context: ctx, trust } = context({
            federation: federation({ includeTrustChain: true }),
        });
        trust.resolveEntity.mockRejectedValue(new Error("trust anchor down"));

        await expect(ctx.trustChainForTenant("tenant")).rejects.toThrow(
            "trust anchor down",
        );
    });

    it("gives no entity ID to a verifier-only entity, so credentials keep x5c", async () => {
        await expect(
            context({
                federation: federation({
                    entityTypes: ["openid_credential_verifier"],
                }),
            }).context.entityIdForTenant("tenant"),
        ).resolves.toBeUndefined();
        await expect(
            context({ federation: federation() }).context.entityIdForTenant(
                "tenant",
            ),
        ).resolves.toBe("https://issuer.example.org/issuers/tenant");
    });
});
