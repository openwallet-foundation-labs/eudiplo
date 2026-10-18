import { describe, expect, it, vi } from "vitest";
import { TypeOrmCredentialConfigKeyChainReferences } from "./typeorm-credential-config-key-chain-references.js";

const keyChain = { tenantId: "acme", id: "signing" };

describe("TypeOrmCredentialConfigKeyChainReferences", () => {
    it("returns the tenant's credential configs whose keyChainId names the key chain", async () => {
        const repository = {
            find: vi.fn().mockResolvedValue([
                { id: "pid", description: "PID" },
                { id: "mdl", description: null },
            ]),
        };
        const source = new TypeOrmCredentialConfigKeyChainReferences(
            repository as any,
        );

        await expect(source.findReferences(keyChain)).resolves.toEqual([
            { kind: "CredentialConfig", id: "pid", description: "PID" },
            { kind: "CredentialConfig", id: "mdl", description: undefined },
        ]);
        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { tenantId: "acme", keyChainId: "signing" },
            }),
        );
    });

    it("checks the spec of a configuration document that is not stored", () => {
        const source = new TypeOrmCredentialConfigKeyChainReferences({} as any);

        expect(source.namesKeyChain({ keyChainId: "signing" }, keyChain)).toBe(
            true,
        );
        expect(source.namesKeyChain({}, keyChain)).toBe(false);
        expect(source.namesKeyChain(null, keyChain)).toBe(false);
    });
});
