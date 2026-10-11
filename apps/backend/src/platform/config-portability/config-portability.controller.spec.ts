import type { Request } from "express";
import { describe, expect, it, vi } from "vitest";
import type { AuditLogService } from "../../audit-log/audit-log.service.js";
import type { TokenPayload } from "../../auth/token.decorator.js";
import type { ConfigBundleService } from "./config-bundle.service.js";
import type { ConfigBundleApplyService } from "./config-bundle-apply.service.js";
import type { ConfigBundleArchiveService } from "./config-bundle-archive.service.js";
import type { ConfigFolderBundleService } from "./config-folder-bundle.service.js";
import type { ConfigImportJournalService } from "./config-import-journal.service.js";
import type { ConfigMigrationService } from "./config-migration.service.js";
import type { ConfigOwnershipService } from "./config-ownership.service.js";
import type { ConfigBundle } from "./config-resource.types.js";
import { ConfigPortabilityController } from "./config-portability.controller.js";

const fingerprint = "a".repeat(64);
const token = {
    entity: { type: "tenant", id: "demo" },
    client: { clientId: "demo-admin" },
    roles: ["tenant:admin"],
} as unknown as TokenPayload;
const request = { headers: {} } as Request;

function createController(result: object) {
    const auditLog = { record: vi.fn().mockResolvedValue(undefined) };
    const folder = { reattach: vi.fn().mockResolvedValue(result) };
    const apply = { apply: vi.fn().mockResolvedValue(result) };
    const controller = new ConfigPortabilityController(
        {} as ConfigBundleService,
        {} as ConfigBundleArchiveService,
        apply as unknown as ConfigBundleApplyService,
        {} as ConfigMigrationService,
        {} as ConfigOwnershipService,
        auditLog as unknown as AuditLogService,
        {} as ConfigImportJournalService,
        folder as unknown as ConfigFolderBundleService,
    );
    return { controller, auditLog };
}

describe("ConfigPortabilityController reattach", () => {
    it("records the client that got a generated secret, never the secret", async () => {
        const { controller, auditLog } = createController({
            items: [{ kind: "Client", id: "folder-client", action: "update" }],
            generatedSecrets: [
                {
                    kind: "Client",
                    id: "folder-client",
                    path: "/spec/secret",
                    value: "generated-secret-value",
                },
            ],
        });

        await controller.reattach(
            token,
            request,
            "Client",
            "folder-client",
            fingerprint,
        );

        expect(auditLog.record).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: "demo",
                actionType: "config_client_secret_generated",
                after: { clients: ["folder-client"], count: 1 },
            }),
        );
        expect(JSON.stringify(auditLog.record.mock.calls)).not.toContain(
            "generated-secret-value",
        );
    });

    it("records no generated secret when reattach generated none", async () => {
        const { controller, auditLog } = createController({
            items: [
                {
                    kind: "PresentationConfig",
                    id: "age-check",
                    action: "update",
                },
            ],
        });

        await controller.reattach(
            token,
            request,
            "PresentationConfig",
            "age-check",
            fingerprint,
        );

        expect(auditLog.record).toHaveBeenCalledOnce();
        expect(auditLog.record).toHaveBeenCalledWith(
            expect.objectContaining({
                actionType: "config_resource_reattached",
            }),
        );
    });
});

describe("ConfigPortabilityController import", () => {
    it("records the client that got a generated secret, never the secret", async () => {
        const { controller, auditLog } = createController({
            items: [{ kind: "Client", id: "bundle-client", action: "create" }],
            generatedSecrets: [
                {
                    kind: "Client",
                    id: "bundle-client",
                    path: "/spec/secret",
                    value: "generated-secret-value",
                },
            ],
        });

        await controller.import(
            token,
            request,
            {} as ConfigBundle,
            "upsert",
            undefined,
            fingerprint,
        );

        expect(auditLog.record).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: "demo",
                actionType: "config_client_secret_generated",
                after: { clients: ["bundle-client"], count: 1 },
            }),
        );
        expect(JSON.stringify(auditLog.record.mock.calls)).not.toContain(
            "generated-secret-value",
        );
    });
});
