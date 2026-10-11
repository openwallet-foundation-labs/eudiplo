import { describe, expect, it, vi } from "vitest";
import { KeyUsage } from "./entities/key-chain.entity.js";
import { KeyRotationService } from "./key-rotation.service.js";

describe("KeyRotationService", () => {
    it("only rotates signing key chains", async () => {
        const keyChainRepository = { find: vi.fn().mockResolvedValue([]) };
        const service = new KeyRotationService(
            keyChainRepository as never,
            { rotate: vi.fn() } as never,
        );

        await service.checkForRotation();

        expect(keyChainRepository.find).toHaveBeenCalledWith({
            where: { rotationEnabled: true, usage: KeyUsage.Sign },
        });
    });
});
