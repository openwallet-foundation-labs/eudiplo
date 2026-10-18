import { describe, expect, it, vi } from "vitest";
import { TypeOrmPresentationConfigKeyChainReferences } from "./typeorm-presentation-config-key-chain-references.js";

const keyChain = { tenantId: "acme", id: "access" };

describe("TypeOrmPresentationConfigKeyChainReferences", () => {
    it("returns the tenant's presentation configs whose accessKeyChainId names the key chain", async () => {
        const repository = {
            find: vi
                .fn()
                .mockResolvedValue([{ id: "age", description: "Age check" }]),
        };
        const source = new TypeOrmPresentationConfigKeyChainReferences(
            repository as any,
        );

        await expect(source.findReferences(keyChain)).resolves.toEqual([
            {
                kind: "PresentationConfig",
                id: "age",
                description: "Age check",
            },
        ]);
        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { tenantId: "acme", accessKeyChainId: "access" },
            }),
        );
    });

    it("checks the spec of a configuration document that is not stored", () => {
        const source = new TypeOrmPresentationConfigKeyChainReferences(
            {} as any,
        );

        expect(
            source.namesKeyChain({ accessKeyChainId: "access" }, keyChain),
        ).toBe(true);
        expect(source.namesKeyChain({ accessKeyChainId: null }, keyChain)).toBe(
            false,
        );
    });
});
