import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { KeyChainEntity, KeyUsage } from "./entities/key-chain.entity.js";
import { KeyChainSigningService } from "./key-chain-signing.service.js";
import { KeyUsageType } from "./types/key-usage-type.js";

describe("KeyChainSigningService", () => {
    it("does not sign with the tenant's encryption key chain", async () => {
        const encryptionKeyChain = Object.assign(new KeyChainEntity(), {
            id: "encryption",
            tenantId: "tenant",
            usageType: KeyUsageType.Encrypt,
            usage: KeyUsage.Encrypt,
            kmsProvider: "db",
        });
        const adapter = { type: "db", sign: vi.fn() };
        const service = Object.create(KeyChainSigningService.prototype) as any;
        service.keyChainRepository = {
            // Returns the stored key chain when it matches every condition.
            findOne: async ({ where }: { where: Record<string, unknown> }) =>
                Object.entries(where).every(
                    ([key, value]) =>
                        encryptionKeyChain[key as keyof KeyChainEntity] ===
                        value,
                )
                    ? encryptionKeyChain
                    : null,
        };
        service.kmsRegistry = { resolve: () => adapter };

        await expect(
            service.signBytes(new Uint8Array([1]), "tenant", "encryption"),
        ).rejects.toThrow(NotFoundException);
        await expect(
            service.createCertificateSigningRequest("tenant", "encryption"),
        ).rejects.toThrow(NotFoundException);
        expect(adapter.sign).not.toHaveBeenCalled();
    });
});
