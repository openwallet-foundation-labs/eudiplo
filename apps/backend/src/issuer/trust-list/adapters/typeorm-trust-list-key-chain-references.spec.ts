import { describe, expect, it, vi } from "vitest";
import { TypeOrmTrustListKeyChainReferences } from "./typeorm-trust-list-key-chain-references.js";

const keyChain = { tenantId: "acme", id: "pid-key" };

function internal(issuerKeyChainId: string, revocationKeyChainId: string) {
    return { type: "internal", issuerKeyChainId, revocationKeyChainId };
}

describe("TypeOrmTrustListKeyChainReferences", () => {
    it("returns trust lists the key chain signs or provides entity certificates for", async () => {
        const repository = {
            find: vi.fn().mockResolvedValue([
                { id: "signed", keyChainId: "pid-key", entityConfig: [] },
                {
                    id: "issuer-entity",
                    description: "PID issuers",
                    keyChainId: "tl-key",
                    entityConfig: [internal("pid-key", "status-key")],
                },
                {
                    id: "revocation-entity",
                    keyChainId: "tl-key",
                    entityConfig: [internal("other", "pid-key")],
                },
                {
                    id: "external-entity",
                    keyChainId: "tl-key",
                    entityConfig: [
                        { type: "external", issuerKeyChainId: "pid-key" },
                    ],
                },
                { id: "unrelated", keyChainId: "tl-key", entityConfig: null },
            ]),
        };
        const source = new TypeOrmTrustListKeyChainReferences(
            repository as any,
        );

        const found = await source.findReferences(keyChain);

        expect(found.map((reference) => reference.id)).toEqual([
            "signed",
            "issuer-entity",
            "revocation-entity",
        ]);
        expect(found[1]).toEqual({
            kind: "TrustList",
            id: "issuer-entity",
            description: "PID issuers",
        });
        expect(repository.find).toHaveBeenCalledWith(
            expect.objectContaining({ where: { tenantId: "acme" } }),
        );
    });

    it("checks the entities of a trust list document that is not stored", () => {
        const source = new TypeOrmTrustListKeyChainReferences({} as any);

        expect(
            source.namesKeyChain(
                { entities: [internal("pid-key", "other")] },
                keyChain,
            ),
        ).toBe(true);
        expect(source.namesKeyChain({ keyChainId: "pid-key" }, keyChain)).toBe(
            true,
        );
        expect(
            source.namesKeyChain({ entities: [internal("a", "b")] }, keyChain),
        ).toBe(false);
        expect(source.namesKeyChain(null, keyChain)).toBe(false);
    });
});
