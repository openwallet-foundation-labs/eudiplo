import { describe, expect, it, vi } from "vitest";
import { SessionCleanupMode } from "./domain/session-retention.js";
import { SessionConfigService } from "./session-config.service.js";

describe("SessionConfigService", () => {
    it("uses typed global defaults without reading environment configuration", () => {
        const service = new SessionConfigService(
            { findOneByOrFail: vi.fn() } as never,
            {
                defaultTtlSeconds: 3600,
                defaultCleanupMode: SessionCleanupMode.Anonymize,
            },
        );

        expect(service.getDefaultTtlSeconds()).toBe(3600);
        expect(service.getDefaultCleanupMode()).toBe(
            SessionCleanupMode.Anonymize,
        );
    });

    it.each([
        [
            "the defaults without a tenant setting",
            undefined,
            { ttlSeconds: 3600, cleanupMode: SessionCleanupMode.Full },
        ],
        [
            "the tenant setting over the defaults",
            { ttlSeconds: 7200, cleanupMode: SessionCleanupMode.Anonymize },
            { ttlSeconds: 7200, cleanupMode: SessionCleanupMode.Anonymize },
        ],
        [
            "the default for each field the tenant did not set",
            { cleanupMode: SessionCleanupMode.Anonymize },
            { ttlSeconds: 3600, cleanupMode: SessionCleanupMode.Anonymize },
        ],
    ])(
        "reports %s as effective retention",
        async (_, sessionConfig, effective) => {
            const service = new SessionConfigService(
                {
                    findOneByOrFail: vi.fn(async () => ({ sessionConfig })),
                } as never,
                {
                    defaultTtlSeconds: 3600,
                    defaultCleanupMode: SessionCleanupMode.Full,
                },
            );

            await expect(service.getEffectiveConfig("tenant")).resolves.toEqual(
                effective,
            );
        },
    );
});
