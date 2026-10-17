import { describe, expect, it, vi } from "vitest";
import { IssuanceConfigurationNotFound } from "../../../issuer/configuration/issuance/domain/issuance-configuration.js";
import { IssuanceConfigVerifierFederationIdentity } from "./issuance-config-verifier-federation-identity.js";

const ENTITY_ID = "https://eudiplo.example/issuers/tenant";

function identity(config: Promise<unknown>) {
    const trust = {
        resolveEntity: vi.fn().mockResolvedValue({ trustChain: ["ec", "ta"] }),
    };
    return {
        trust,
        identity: new IssuanceConfigVerifierFederationIdentity(
            { getIssuanceConfiguration: vi.fn(() => config) } as never,
            trust as never,
        ),
    };
}

const federation = (entityTypes?: string[]) => ({
    federation: {
        entityId: ENTITY_ID,
        trustAnchors: [{ entityId: "https://ta.example.org" }],
        entityTypes,
        includeTrustChain: true,
    },
});

describe("IssuanceConfigVerifierFederationIdentity", () => {
    it("is a verifier identity only with openid_credential_verifier in entityTypes", async () => {
        await expect(
            identity(Promise.resolve(federation())).identity.forTenant("t"),
        ).resolves.toBeUndefined();
        await expect(
            identity(
                Promise.resolve(
                    federation([
                        "openid_credential_issuer",
                        "openid_credential_verifier",
                    ]),
                ),
            ).identity.forTenant("t"),
        ).resolves.toEqual({ entityId: ENTITY_ID, includeTrustChain: true });
    });

    it("treats a missing issuance configuration as no identity but passes other errors on", async () => {
        await expect(
            identity(
                Promise.reject(new IssuanceConfigurationNotFound("t")),
            ).identity.forTenant("t"),
        ).resolves.toBeUndefined();
        await expect(
            identity(
                Promise.reject(new Error("database down")),
            ).identity.forTenant("t"),
        ).rejects.toThrow("database down");
    });

    it("resolves the trust chain of the entity and refuses without one", async () => {
        const configured = identity(
            Promise.resolve(federation(["openid_credential_verifier"])),
        );
        await expect(configured.identity.trustChain("t")).resolves.toEqual([
            "ec",
            "ta",
        ]);
        expect(configured.trust.resolveEntity).toHaveBeenCalledWith(
            ENTITY_ID,
            expect.objectContaining({ entityId: ENTITY_ID }),
        );
        await expect(
            identity(Promise.resolve({ federation: null })).identity.trustChain(
                "t",
            ),
        ).rejects.toThrow("no OpenID Federation entity");
    });
});
