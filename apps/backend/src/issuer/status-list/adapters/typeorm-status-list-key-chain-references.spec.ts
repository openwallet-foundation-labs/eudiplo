import { describe, expect, it, vi } from "vitest";
import { TypeOrmStatusListKeyChainReferences } from "./typeorm-status-list-key-chain-references.js";

const keyChain = { tenantId: "acme", id: "status" };

describe("TypeOrmStatusListKeyChainReferences", () => {
    it("returns the tenant's status lists whose keyChainId names the key chain", async () => {
        const repository = {
            find: vi
                .fn()
                .mockResolvedValue([{ id: "shared", description: null }]),
        };
        const source = new TypeOrmStatusListKeyChainReferences(
            repository as any,
        );

        await expect(source.findReferences(keyChain)).resolves.toEqual([
            { kind: "StatusList", id: "shared", description: undefined },
        ]);
        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { tenantId: "acme", keyChainId: "status" },
            }),
        );
    });

    it("checks the spec of a status list document that is not stored", () => {
        const source = new TypeOrmStatusListKeyChainReferences({} as any);

        expect(source.namesKeyChain({ keyChainId: "status" }, keyChain)).toBe(
            true,
        );
        expect(source.namesKeyChain({ keyChainId: null }, keyChain)).toBe(
            false,
        );
    });
});
