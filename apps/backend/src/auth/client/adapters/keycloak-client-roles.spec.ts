import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ClientIdTaken } from "../domain/client-data.js";
import type { ClientEntity } from "../entities/client.entity.js";
import { KeycloakClientsProvider } from "./keycloak-clients.service.js";

function provider({
    mirror,
    kcClient,
    serviceAccount = { id: "svc" },
}: {
    mirror?: Partial<ClientEntity>;
    kcClient?: { id: string; attributes?: Record<string, unknown> };
    serviceAccount?: { id?: string };
}) {
    const kc = {
        clients: {
            find: vi.fn(({ clientId }: { clientId: string }) =>
                Promise.resolve(
                    clientId === "realm-management"
                        ? [{ id: "kc-realm-management" }]
                        : kcClient
                          ? [kcClient]
                          : [],
                ),
            ),
            create: vi.fn().mockRejectedValue({ response: { status: 409 } }),
            update: vi.fn().mockResolvedValue(undefined),
            getServiceAccountUser: vi.fn().mockResolvedValue(serviceAccount),
        },
        roles: { find: vi.fn().mockResolvedValue([]) },
        users: {
            listCompositeRealmRoleMappings: vi
                .fn()
                .mockResolvedValue([
                    { name: "issuance:offer" },
                    { name: "tenant:admin" },
                    { name: "default-roles-eudiplo" },
                    {},
                ]),
            listRoleMappings: vi.fn().mockResolvedValue({
                clientMappings: {
                    "realm-management": {
                        client: "realm-management",
                        mappings: [{ name: "realm-admin" }],
                    },
                },
            }),
            // From a group: listCompositeClientRoleMappings is effective.
            listCompositeClientRoleMappings: vi
                .fn()
                .mockResolvedValue([
                    { name: "realm-admin" },
                    { name: "manage-users" },
                ]),
            addRealmRoleMappings: vi.fn(),
        },
    };
    const clientRepo = {
        findOneBy: vi.fn().mockResolvedValue(mirror ?? null),
        countBy: vi.fn().mockResolvedValue(mirror ? 1 : 0),
        create: vi.fn((entity) => entity),
        save: vi.fn(),
    };
    return {
        kc,
        clientRepo,
        provider: Object.assign(
            Object.create(KeycloakClientsProvider.prototype),
            { kc, clientRepo, logger: { warn: vi.fn() } },
        ) as KeycloakClientsProvider,
    };
}

describe("KeycloakClientsProvider.getClientRoles", () => {
    it("adds the roles of the service account in Keycloak to the mirrored roles", async () => {
        const { provider: clients, kc } = provider({
            mirror: { clientId: "app", roles: ["clients:manage"] as never },
            kcClient: { id: "kc-app", attributes: { tenant_id: "tenant-1" } },
        });

        await expect(
            clients.getClientRoles("tenant-1", "app"),
        ).resolves.toEqual([
            "clients:manage",
            "issuance:offer",
            "tenant:admin",
            "realm-management/realm-admin",
            "realm-management/manage-users",
        ]);
        expect(kc.clients.getServiceAccountUser).toHaveBeenCalledWith({
            id: "kc-app",
        });
        expect(kc.users.listCompositeRealmRoleMappings).toHaveBeenCalledWith({
            id: "svc",
        });
        expect(kc.users.listRoleMappings).toHaveBeenCalledWith({ id: "svc" });
        expect(kc.users.listCompositeClientRoleMappings).toHaveBeenCalledWith({
            id: "svc",
            clientUniqueId: "kc-realm-management",
        });
    });

    it("does not reach a Keycloak client outside the tenant's mirror", async () => {
        const { provider: clients, kc } = provider({
            kcClient: { id: "kc-root" },
        });

        await expect(
            clients.getClientRoles("tenant-1", "eudiplo-root"),
        ).resolves.toBeUndefined();
        expect(kc.clients.find).not.toHaveBeenCalled();
    });

    it("refuses a Keycloak client owned by another tenant", async () => {
        const { provider: clients } = provider({
            mirror: { clientId: "app", roles: [] },
            kcClient: { id: "kc-app", attributes: { tenant_id: "tenant-2" } },
        });

        await expect(
            clients.getClientRoles("tenant-1", "app"),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it("uses the mirrored roles when Keycloak has no such client", async () => {
        const { provider: clients } = provider({
            mirror: { clientId: "app", roles: ["clients:manage"] as never },
        });

        await expect(
            clients.getClientRoles("tenant-1", "app"),
        ).resolves.toEqual(["clients:manage"]);
    });

    it("uses the mirrored roles when the client has no service account", async () => {
        const { provider: clients, kc } = provider({
            mirror: { clientId: "app", roles: ["clients:manage"] as never },
            kcClient: { id: "kc-app", attributes: { tenant_id: "tenant-1" } },
            serviceAccount: {},
        });

        await expect(
            clients.getClientRoles("tenant-1", "app"),
        ).resolves.toEqual(["clients:manage"]);
        expect(kc.users.listCompositeRealmRoleMappings).not.toHaveBeenCalled();
    });
});

describe("KeycloakClientsProvider.addClient", () => {
    const dto = { clientId: "app", roles: ["issuance:offer" as never] };

    it("refuses a client ID mirrored for another tenant", async () => {
        const { provider: clients, kc } = provider({
            mirror: { clientId: "app", roles: [], tenantId: "tenant-2" },
        });

        await expect(clients.addClient("tenant-1", dto)).rejects.toBeInstanceOf(
            ClientIdTaken,
        );
        expect(kc.clients.create).not.toHaveBeenCalled();
    });

    it.each([
        ["without a tenant", {}],
        ["of another tenant", { tenant_id: "tenant-2" }],
    ])(
        "does not adopt an existing Keycloak client %s",
        async (_name, attributes) => {
            const { provider: clients, kc } = provider({
                kcClient: { id: "kc-admin", attributes },
            });

            await expect(
                clients.addClient("tenant-1", dto),
            ).rejects.toBeInstanceOf(ClientIdTaken);
            expect(kc.clients.update).not.toHaveBeenCalled();
        },
    );

    it("adopts an existing Keycloak client of the tenant", async () => {
        const {
            provider: clients,
            kc,
            clientRepo,
        } = provider({
            kcClient: { id: "kc-app", attributes: { tenant_id: "tenant-1" } },
        });

        await clients.addClient("tenant-1", dto);

        expect(kc.clients.update).toHaveBeenCalled();
        expect(clientRepo.save).toHaveBeenCalled();
    });
});
