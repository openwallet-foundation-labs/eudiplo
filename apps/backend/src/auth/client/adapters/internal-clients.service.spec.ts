import { describe, expect, it, vi } from "vitest";
import { ClientIdTaken } from "../domain/client-data.js";
import { InternalClientsProvider } from "./internal-clients.service.js";

function provider(existing?: {
    clientId: string;
    roles: string[];
    tenantId?: string | null;
}) {
    const repo = {
        findOneBy: vi.fn().mockResolvedValue(existing ?? null),
        countBy: vi.fn().mockResolvedValue(existing ? 1 : 0),
        save: vi.fn((entity) => Promise.resolve(entity)),
    };
    return {
        repo,
        clients: Object.assign(
            Object.create(InternalClientsProvider.prototype),
            { repo },
        ) as InternalClientsProvider,
    };
}

describe("InternalClientsProvider", () => {
    it("returns the roles of a client of the tenant", async () => {
        const { clients, repo } = provider({
            clientId: "app",
            roles: ["issuance:offer"],
        });

        await expect(
            clients.getClientRoles("tenant-1", "app"),
        ).resolves.toEqual(["issuance:offer"]);
        expect(repo.findOneBy).toHaveBeenCalledWith({
            clientId: "app",
            tenant: { id: "tenant-1" },
        });
    });

    it("returns nothing for a client the tenant does not have", async () => {
        await expect(
            provider().clients.getClientRoles("tenant-1", "app"),
        ).resolves.toBeUndefined();
    });

    it("refuses the ID of the root client instead of overwriting it", async () => {
        const { clients, repo } = provider({
            clientId: "root",
            roles: ["tenants:manage"],
            tenantId: null,
        });

        await expect(
            clients.addClient("tenant-1", {
                clientId: "root",
                roles: ["issuance:offer" as never],
            }),
        ).rejects.toBeInstanceOf(ClientIdTaken);
        expect(repo.findOneBy).toHaveBeenCalledWith({ clientId: "root" });
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("refuses the ID of another tenant's client", async () => {
        const { clients, repo } = provider({
            clientId: "app",
            roles: ["issuance:offer"],
            tenantId: "tenant-2",
        });

        await expect(
            clients.addClient("tenant-1", {
                clientId: "app",
                roles: ["issuance:offer" as never],
            }),
        ).rejects.toBeInstanceOf(ClientIdTaken);
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("replaces a client of the same tenant, as when a tenant is created again", async () => {
        const { clients, repo } = provider({
            clientId: "tenant-1-admin",
            roles: ["clients:manage"],
            tenantId: "tenant-1",
        });

        const created = await clients.addClient("tenant-1", {
            clientId: "tenant-1-admin",
            roles: ["clients:manage" as never, "issuance:manage" as never],
        });

        expect(repo.save).toHaveBeenCalled();
        expect(created.clientSecret).toBeTruthy();
    });
});
