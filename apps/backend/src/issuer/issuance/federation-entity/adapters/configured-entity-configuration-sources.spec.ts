import { describe, expect, it, vi } from "vitest";
import { KeyUsageType } from "../../../../crypto/key/types/key-usage-type.js";
import { IssuanceConfigurationNotFound } from "../../../configuration/issuance/domain/issuance-configuration.js";
import { ConfiguredEntityConfigurationSources } from "./configured-entity-configuration-sources.js";

const federation = {
    entityId: "https://eudiplo.example/issuers/tenant",
    trustAnchors: [{ entityId: "https://ta.example.org" }],
};

function sources(config: () => Promise<unknown>, allowHttp = false) {
    const keyChains = {
        getPublicKeysByUsageTypes: vi
            .fn()
            .mockResolvedValue([{ kty: "EC", kid: "credential" }]),
    };
    return {
        keyChains,
        sources: new ConfiguredEntityConfigurationSources(
            { getIssuanceConfiguration: vi.fn(config) } as never,
            {
                execute: vi.fn().mockResolvedValue({
                    credentialIssuer: {
                        credential_issuer: federation.entityId,
                    },
                    authorizationServers: [{ issuer: federation.entityId }],
                }),
            },
            { issuer: vi.fn() } as never,
            keyChains,
            { credentialVerifierMetadata: vi.fn() },
            () => allowHttp,
        ),
    };
}

describe("ConfiguredEntityConfigurationSources", () => {
    it("changes the version with the federation block within the same second", async () => {
        const updatedAt = new Date("2026-10-17T10:00:00Z");
        let organization = "First";
        const { sources: s } = sources(async () => ({
            federation: {
                ...federation,
                entityMetadata: { organization_name: organization },
            },
            updatedAt,
        }));

        const first = await s.ownEntity("tenant");
        organization = "Second";
        const second = await s.ownEntity("tenant");

        expect(first?.version).not.toBe(second?.version);
    });

    it("versions the entity by the configuration's updatedAt", async () => {
        let updatedAt = new Date("2026-10-17T10:00:00Z");
        const { sources: s } = sources(async () => ({ federation, updatedAt }));

        const first = await s.ownEntity("tenant");
        updatedAt = new Date("2026-10-17T10:00:01Z");
        const second = await s.ownEntity("tenant");

        expect(first?.entity.entityId).toBe(federation.entityId);
        expect(first?.version).not.toBe(second?.version);
    });

    it.each([
        ["eudiplo", false, "is not a URL"],
        [
            "http://localhost:3000/issuers/tenant",
            false,
            "OUTBOUND_URL_ALLOW_HTTP",
        ],
        ["http://localhost:3000/issuers/tenant", true, undefined],
        ["https://eudiplo.example/issuers/tenant", false, undefined],
    ])(
        "names the problem of the stored entity id %s (allowHttp %s)",
        async (entityId, allowHttp, problem) => {
            const own = await sources(
                async () => ({
                    federation: { ...federation, entityId },
                    updatedAt: new Date(),
                }),
                allowHttp,
            ).sources.ownEntity("tenant");

            expect(own?.entityIdProblem).toEqual(
                problem === undefined
                    ? undefined
                    : expect.stringContaining(problem),
            );
        },
    );

    it("has no entity without a configuration, but passes other errors on", async () => {
        await expect(
            sources(() =>
                Promise.reject(new IssuanceConfigurationNotFound("tenant")),
            ).sources.ownEntity("tenant"),
        ).resolves.toBeUndefined();
        await expect(
            sources(() =>
                Promise.reject(new Error("database down")),
            ).sources.ownEntity("tenant"),
        ).rejects.toThrow("database down");
    });

    it("publishes the attestation and status list keys as credential issuer keys", async () => {
        const { sources: s, keyChains } = sources(async () => ({ federation }));

        const issuer = await s.credentialIssuer("tenant");

        expect(keyChains.getPublicKeysByUsageTypes).toHaveBeenCalledWith(
            "tenant",
            [KeyUsageType.Attestation, KeyUsageType.StatusList],
        );
        expect(issuer.signingKeys).toEqual([{ kty: "EC", kid: "credential" }]);
        expect(issuer.authorizationServers).toEqual([
            { issuer: federation.entityId },
        ]);
    });
});
