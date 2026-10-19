import { describe, expect, it, vi } from "vitest";
import type { AuditLogService } from "../../audit-log/audit-log.service.js";
import { FederationTrustAnchorReferences } from "./application/federation-trust-anchor-references.js";
import type { FederationTrustAnchorData } from "./domain/federation-trust-anchor-data.js";
import {
    FederationTrustAnchorInUseError,
    type FederationTrustAnchorReference,
} from "./domain/federation-trust-anchor-reference.js";
import { FederationTrustAnchorService } from "./federation-trust-anchor.service.js";
import type { FederationTrustAnchorRepository } from "./ports/federation-trust-anchor.repository.js";

const anchor: FederationTrustAnchorData = {
    id: "eu",
    tenantId: "acme",
    entityId: "https://ta.example.org",
    jwks: { keys: [] } as never,
};

/** A service over one stored anchor whose entity ID `named` configurations name. */
function service(named: FederationTrustAnchorReference[]) {
    const repo = {
        listForTenant: vi.fn(),
        findForTenant: vi.fn(async (_tenant: string, id: string) =>
            id === anchor.id ? anchor : null,
        ),
        findByEntityIds: vi.fn(async () => []),
        save: vi.fn(async (data: FederationTrustAnchorData) => data),
        deleteForTenant: vi.fn(async () => undefined),
    } satisfies FederationTrustAnchorRepository;
    const references = new FederationTrustAnchorReferences();
    const findReferences = vi.fn(async (_tenant: string, entityId: string) =>
        entityId === anchor.entityId ? named : [],
    );
    references.register({
        kind: "PresentationConfig",
        findReferences,
        trustAnchorIds: () => [],
    });
    const auditLog = { record: vi.fn() } as unknown as AuditLogService;
    return {
        repo,
        findReferences,
        service: new FederationTrustAnchorService(repo, auditLog, references),
    };
}

const pid: FederationTrustAnchorReference = {
    kind: "PresentationConfig",
    id: "pid",
};

describe("FederationTrustAnchorService", () => {
    it("refuses to delete an anchor whose entity ID a configuration names", async () => {
        const { service: anchors, repo } = service([pid]);

        const refused = anchors.delete("acme", "eu");

        await expect(refused).rejects.toBeInstanceOf(
            FederationTrustAnchorInUseError,
        );
        await expect(refused).rejects.toMatchObject({
            anchorId: "eu",
            entityId: anchor.entityId,
            change: "delete",
            references: [pid],
        });
        expect(repo.deleteForTenant).not.toHaveBeenCalled();
    });

    it("deletes an unreferenced anchor, and a referenced one without the check", async () => {
        const unreferenced = service([]);
        await unreferenced.service.delete("acme", "eu");
        expect(unreferenced.repo.deleteForTenant).toHaveBeenCalledWith(
            "acme",
            "eu",
        );

        const referenced = service([pid]);
        await referenced.service.delete("acme", "eu", undefined, undefined, {
            checkReferences: false,
        });
        expect(referenced.repo.deleteForTenant).toHaveBeenCalled();
        expect(referenced.findReferences).not.toHaveBeenCalled();
    });

    it("refuses to change the entity ID of a referenced anchor, unless told not to check", async () => {
        const { service: anchors, repo } = service([pid]);

        await expect(
            anchors.update("acme", "eu", {
                entityId: "https://moved.example.org",
            }),
        ).rejects.toMatchObject({ change: "change-entity-id" });
        expect(repo.save).not.toHaveBeenCalled();

        await anchors.update(
            "acme",
            "eu",
            { entityId: "https://moved.example.org" },
            undefined,
            undefined,
            { checkReferences: false },
        );
        expect(repo.save).toHaveBeenCalledWith(
            expect.objectContaining({ entityId: "https://moved.example.org" }),
        );
    });

    it("updates a referenced anchor that keeps its entity ID", async () => {
        const { service: anchors, findReferences } = service([pid]);

        await expect(
            anchors.update("acme", "eu", {
                entityId: anchor.entityId,
                description: "Renamed",
            }),
        ).resolves.toMatchObject({ description: "Renamed" });
        expect(findReferences).not.toHaveBeenCalled();
    });
});
