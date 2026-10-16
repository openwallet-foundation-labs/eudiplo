import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { schemaUrl } from "@eudiplo/config-format/config-format.js";
import {
    InternalServerErrorException,
    Logger,
    ServiceUnavailableException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { describe, expect, it, vi } from "vitest";
import { importedRotationIntervals } from "../../crypto/key/key-chain-import-rotation.js";
import { ConfigImportService } from "../config-import/config-import.service.js";
import { ConfigImportOrchestratorService } from "../config-import/config-import-orchestrator.service.js";
import { ConfigBundleApplyService } from "./config-bundle-apply.service.js";
import { ConfigFolderBundleService } from "./config-folder-bundle.service.js";
import { ConfigMigrationService } from "./config-migration.service.js";
import { ConfigResourceRegistry } from "./config-resource.registry.js";

function createService(apply = vi.fn()) {
    const registry = new ConfigResourceRegistry();
    const registerPortableRunner = vi.fn();
    const service = new ConfigFolderBundleService(
        {
            getOrThrow: () =>
                fileURLToPath(
                    new URL("../../../../../assets/config", import.meta.url),
                ),
        } as unknown as ConfigService,
        {
            replacePlaceholders: <T>(value: T) => value,
        } as ConfigImportService,
        new ConfigMigrationService(registry),
        registry,
        { apply } as unknown as ConfigBundleApplyService,
        {
            registerPortableRunner,
        } as unknown as ConfigImportOrchestratorService,
    );
    return { service, registerPortableRunner };
}

describe("ConfigFolderBundleService", () => {
    it("builds a portable bundle from the demo tenant folder", () => {
        const { service } = createService();

        const bundle = service.buildBundle(
            "demo",
            fileURLToPath(
                new URL("../../../../../assets/config/demo", import.meta.url),
            ),
        );

        expect(bundle.documents).toHaveLength(15);
        expect(bundle.assets).toHaveLength(4);
        expect(bundle.documents).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    $schema: schemaUrl("IssuanceConfig"),
                }),
                expect.objectContaining({
                    $schema: schemaUrl("PresentationConfig"),
                }),
                expect.objectContaining({ $schema: schemaUrl("KeyChain") }),
            ]),
        );
        expect(bundle.manifest.resources).toHaveLength(bundle.documents.length);
        // Startups do not renew the certificates the import creates, so the
        // demo key chains must rotate before they expire.
        for (const document of bundle.documents) {
            const policy = (document.spec as any).rotationPolicy;
            if (!policy?.enabled) continue;
            const { intervalDays, certValidityDays } =
                importedRotationIntervals(policy);
            expect(intervalDays).toBeLessThan(certValidityDays);
        }
    });

    it("applies a tenant folder with a stable ownership source", async () => {
        const apply = vi.fn().mockResolvedValue({ items: [] });
        const { service, registerPortableRunner } = createService(apply);

        await service.applyTenantFolder("demo", "replace");

        expect(registerPortableRunner).toHaveBeenCalledOnce();
        expect(apply).toHaveBeenCalledWith(
            "demo",
            expect.objectContaining({
                manifest: expect.objectContaining({ tenant: "demo" }),
            }),
            "replace",
            `folder:${fileURLToPath(new URL("../../../../../assets/config/demo", import.meta.url))}`,
        );
    });

    function spyOnWarn() {
        return vi
            .spyOn(Logger.prototype, "warn")
            .mockImplementation(() => undefined);
    }

    function folderService(apply: ReturnType<typeof vi.fn>) {
        return { service: createService(apply).service, warn: spyOnWarn() };
    }

    it("names clients that got a generated secret at startup, never the secret", async () => {
        const { service, warn } = folderService(
            vi.fn().mockResolvedValue({
                items: [],
                generatedSecrets: [
                    {
                        kind: "Client",
                        id: "folder-client",
                        path: "/spec/secret",
                        value: "generated-secret-value",
                    },
                ],
            }),
        );
        try {
            await service.applyTenantFolder("demo", "upsert");

            const messages = warn.mock.calls.map(([message]) =>
                String(message),
            );
            expect(messages).toEqual([
                expect.stringContaining(
                    "[demo] Client 'folder-client' got a generated secret",
                ),
            ]);
            expect(messages[0]).toContain(
                "/api/config-bundles/resources/Client/folder-client/reattach/plan",
            );
            expect(messages.join()).not.toContain("generated-secret-value");
        } finally {
            warn.mockRestore();
        }
    });

    it("names clients that got a generated secret before a startup apply failed", async () => {
        const failure = new InternalServerErrorException({
            code: "CONFIG_APPLY_FAILED",
            generatedSecrets: [
                {
                    kind: "Client",
                    id: "folder-client",
                    path: "/spec/secret",
                    value: "generated-secret-value",
                },
            ],
        });
        const { service, warn } = folderService(
            vi.fn().mockRejectedValue(failure),
        );
        try {
            await expect(
                service.applyTenantFolder("demo", "upsert"),
            ).rejects.toBe(failure);

            const messages = warn.mock.calls.map(([message]) =>
                String(message),
            );
            expect(messages).toEqual([
                expect.stringContaining("Client 'folder-client'"),
            ]);
            expect(messages.join()).not.toContain("generated-secret-value");
        } finally {
            warn.mockRestore();
        }
    });

    it("warns about no client when the startup import generated no secret", async () => {
        const { service, warn } = folderService(
            vi.fn().mockResolvedValue({ items: [] }),
        );
        try {
            await service.applyTenantFolder("demo", "upsert");

            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });

    it("rethrows a startup apply failure without generated secrets and warns about no client", async () => {
        const failure = new Error("boom");
        const { service, warn } = folderService(
            vi.fn().mockRejectedValue(failure),
        );
        try {
            await expect(
                service.applyTenantFolder("demo", "upsert"),
            ).rejects.toBe(failure);

            expect(warn).not.toHaveBeenCalled();
        } finally {
            warn.mockRestore();
        }
    });

    it("names clients from a journal failure that reports generated secrets", async () => {
        const failure = new ServiceUnavailableException({
            code: "CONFIG_JOURNAL_WRITE_FAILED",
            generatedSecrets: [
                {
                    kind: "Client",
                    id: "folder-client",
                    path: "/spec/secret",
                    value: "generated-secret-value",
                },
            ],
        });
        const { service, warn } = folderService(
            vi.fn().mockRejectedValue(failure),
        );
        try {
            await expect(
                service.applyTenantFolder("demo", "upsert"),
            ).rejects.toBe(failure);

            expect(warn).toHaveBeenCalledOnce();
            expect(String(warn.mock.calls[0][0])).toContain(
                "Client 'folder-client'",
            );
        } finally {
            warn.mockRestore();
        }
    });

    it("uses stable IDs for legacy singleton configuration files", () => {
        const tenantRoot = mkdtempSync(
            join(tmpdir(), "eudiplo-config-folder-"),
        );
        mkdirSync(join(tenantRoot, "issuance"), { recursive: true });
        writeFileSync(
            join(tenantRoot, "registrar.json"),
            JSON.stringify({
                registrarUrl: "https://registrar.example.com/api",
                oidcUrl: "https://auth.example.com/realms/registrar",
                clientId: "test-client",
                username: "test-user",
                password: "test-password",
            }),
        );
        writeFileSync(
            join(tenantRoot, "issuance", "issuance.json"),
            JSON.stringify({
                authorizationServers: [
                    { id: "issuer-built-in", type: "built-in" },
                ],
            }),
        );
        const { service } = createService();

        try {
            const bundle = service.buildBundle("test", tenantRoot);

            expect(bundle.documents).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        $schema: schemaUrl("RegistrarConfig"),
                        metadata: { generation: 1 },
                    }),
                    expect.objectContaining({
                        $schema: schemaUrl("IssuanceConfig"),
                        metadata: { generation: 1 },
                    }),
                ]),
            );
        } finally {
            rmSync(tenantRoot, { recursive: true, force: true });
        }
    });
});
