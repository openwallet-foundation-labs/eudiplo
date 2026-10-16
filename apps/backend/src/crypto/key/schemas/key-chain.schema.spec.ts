import { describe, expect, it } from "vitest";
import { KeyUsageType } from "../types/key-usage-type.js";
import { KeyChainCreateSchema } from "./key-chain.schema.js";

describe("KeyChainCreateSchema rotation policy", () => {
    const create = (rotationPolicy: Record<string, unknown>) =>
        KeyChainCreateSchema.safeParse({
            usageType: KeyUsageType.Attestation,
            type: "standalone",
            rotationPolicy,
        });

    it("requires intervalDays when rotation is enabled", () => {
        const result = create({ enabled: true });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ["rotationPolicy", "intervalDays"],
                message: "intervalDays is required when rotation is enabled.",
            }),
        ]);
    });

    it.each([
        { enabled: true, intervalDays: 90 },
        { enabled: false },
        { enabled: false, certValidityDays: 365 },
    ])("accepts %o", (rotationPolicy) => {
        expect(create(rotationPolicy).success).toBe(true);
    });

    it("still rejects unknown rotation policy fields", () => {
        expect(create({ enabled: false, unknown: true }).success).toBe(false);
    });
});
