import { describe, expect, it, vi } from "vitest";
import type { IssuanceConfig } from "../entities/issuance-config.entity.js";
import { TypeOrmIssuanceConfigTrustListReferences } from "./typeorm-issuance-config-trust-list-references.js";

const list = { tenantId: "acme", id: "wallet-providers" };

function source(config: Partial<IssuanceConfig> | null) {
    const repository = { findOne: vi.fn().mockResolvedValue(config) };
    return {
        repository,
        references: new TypeOrmIssuanceConfigTrustListReferences(
            repository as any,
        ),
    };
}

describe("TypeOrmIssuanceConfigTrustListReferences", () => {
    it("reports the shared wallet provider trust lists", async () => {
        const { references, repository } = source({
            walletProviderTrustLists: [
                { trustListId: "wallet-providers" } as any,
            ],
            authorizationServers: [],
        });

        await expect(references.findReferences(list)).resolves.toEqual([
            { kind: "IssuanceConfig" },
        ]);
        expect(repository.findOne).toHaveBeenCalledWith(
            expect.objectContaining({ where: { tenantId: "acme" } }),
        );
    });

    it("reports the wallet provider trust lists of an authorization server", async () => {
        const { references } = source({
            authorizationServers: [
                { id: "external", type: "external" } as any,
                {
                    id: "built-in",
                    type: "built-in",
                    walletProviderTrustLists: [
                        {
                            url: "https://eudiplo.example/issuers/acme/trust-list/wallet-providers",
                            verifierX509Der: "MIIB...",
                        },
                    ],
                } as any,
            ],
        });

        await expect(references.findReferences(list)).resolves.toEqual([
            { kind: "IssuanceConfig" },
        ]);
    });

    it("reports nothing for other lists or a tenant without issuance configuration", async () => {
        await expect(
            source({
                walletProviderTrustLists: [
                    { trustListId: "wallet-providers-old" } as any,
                ],
                authorizationServers: [],
            }).references.findReferences(list),
        ).resolves.toEqual([]);
        await expect(
            source(null).references.findReferences(list),
        ).resolves.toEqual([]);
    });

    it("checks the spec of an issuance configuration document that is not stored", () => {
        const { references } = source(null);

        expect(
            references.namesList(
                {
                    authorizationServers: [
                        {
                            id: "built-in",
                            type: "built-in",
                            walletProviderTrustLists: [
                                { trustListId: "wallet-providers" },
                            ],
                        },
                    ],
                },
                list,
            ),
        ).toBe(true);
        expect(references.namesList({ batchSize: 1 }, list)).toBe(false);
        expect(references.namesList(null, list)).toBe(false);
    });
});
