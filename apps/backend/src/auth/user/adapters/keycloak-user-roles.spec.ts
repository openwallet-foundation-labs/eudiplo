import { ConflictException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { KeycloakUsersProvider } from "./keycloak-users.service.js";

function provider(
    user: { id: string; username: string; attributes?: object } | undefined,
) {
    const kc = {
        clients: {
            find: vi.fn().mockResolvedValue([{ id: "kc-realm-management" }]),
        },
        roles: {
            find: vi
                .fn()
                .mockResolvedValue(
                    [
                        "issuance:offer",
                        "clients:manage",
                        "presentation:request",
                        "default-roles-eudiplo",
                    ].map((name) => ({ id: `id-${name}`, name })),
                ),
            create: vi.fn(),
        },
        users: {
            findOne: vi.fn().mockResolvedValue(user),
            find: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue({ id: user?.id }),
            update: vi.fn(),
            resetPassword: vi.fn(),
            listRealmRoleMappings: vi
                .fn()
                .mockResolvedValue(
                    [
                        "issuance:offer",
                        "clients:manage",
                        "default-roles-eudiplo",
                    ].map((name) => ({ id: `id-${name}`, name })),
                ),
            addRealmRoleMappings: vi.fn(),
            delRealmRoleMappings: vi.fn(),
            listCompositeRealmRoleMappings: vi
                .fn()
                .mockResolvedValue([
                    { name: "issuance:offer" },
                    { name: "tenant:admin" },
                    { name: "offline_access" },
                    {},
                ]),
            // Effective, so also from a group or composite realm role.
            listCompositeClientRoleMappings: vi
                .fn()
                .mockResolvedValue([{ name: "realm-admin" }]),
            listRoleMappings: vi.fn().mockResolvedValue({
                clientMappings: {
                    "realm-management": {
                        client: "realm-management",
                        mappings: [{ name: "manage-users" }],
                    },
                },
            }),
        },
    };
    return {
        kc,
        users: Object.assign(Object.create(KeycloakUsersProvider.prototype), {
            kc,
        }) as KeycloakUsersProvider,
    };
}

describe("KeycloakUsersProvider.getUserRoles", () => {
    it("returns the effective EUDIPLO and realm-management roles and the direct client roles", async () => {
        const { users, kc } = provider({
            id: "u1",
            username: "alice",
            attributes: { tenant_id: ["tenant-1"] },
        });

        await expect(users.getUserRoles("tenant-1", "u1")).resolves.toEqual([
            "issuance:offer",
            "tenant:admin",
            "realm-management/realm-admin",
            "realm-management/manage-users",
        ]);
        expect(kc.users.listCompositeRealmRoleMappings).toHaveBeenCalledWith({
            id: "u1",
        });
    });

    it("refuses a user of another tenant", async () => {
        const { users } = provider({
            id: "u1",
            username: "alice",
            attributes: { tenant_id: ["tenant-2"] },
        });

        await expect(
            users.getUserRoles("tenant-1", "u1"),
        ).rejects.toBeInstanceOf(ConflictException);
    });

    it("returns nothing for an unknown user", async () => {
        await expect(
            provider(undefined).users.getUserRoles("tenant-1", "u1"),
        ).resolves.toBeUndefined();
    });
});

describe("KeycloakUsersProvider.updateUser", () => {
    const alice = {
        id: "u1",
        username: "alice",
        attributes: { tenant_id: ["tenant-1"] },
    };

    it("keeps the roles in Keycloak when the update has none", async () => {
        const { users, kc } = provider(alice);

        await users.updateUser("tenant-1", "u1", { enabled: false });

        expect(kc.users.delRealmRoleMappings).not.toHaveBeenCalled();
        expect(kc.users.addRealmRoleMappings).not.toHaveBeenCalled();
    });

    it("removes every EUDIPLO role but keeps the default roles for no roles", async () => {
        const { users, kc } = provider(alice);

        await users.updateUser("tenant-1", "u1", { roles: [] });

        expect(kc.users.delRealmRoleMappings).toHaveBeenCalledWith({
            id: "u1",
            roles: [
                { id: "id-issuance:offer", name: "issuance:offer" },
                { id: "id-clients:manage", name: "clients:manage" },
            ],
        });
        expect(kc.users.addRealmRoleMappings).not.toHaveBeenCalled();
    });

    it("replaces only the EUDIPLO roles and returns only those", async () => {
        const { users, kc } = provider(alice);
        // Mappings before the sync; the response reads those after it.
        kc.users.listRealmRoleMappings
            .mockResolvedValueOnce(
                [
                    "issuance:offer",
                    "clients:manage",
                    "default-roles-eudiplo",
                ].map((name) => ({ id: `id-${name}`, name })),
            )
            .mockResolvedValueOnce(
                [
                    "issuance:offer",
                    "presentation:request",
                    "default-roles-eudiplo",
                ].map((name) => ({ id: `id-${name}`, name })),
            );

        const updated = await users.updateUser("tenant-1", "u1", {
            roles: ["issuance:offer", "presentation:request"] as never,
        });

        expect(kc.users.delRealmRoleMappings).toHaveBeenCalledWith({
            id: "u1",
            roles: [{ id: "id-clients:manage", name: "clients:manage" }],
        });
        expect(kc.users.addRealmRoleMappings).toHaveBeenCalledWith({
            id: "u1",
            roles: [
                {
                    id: "id-presentation:request",
                    name: "presentation:request",
                },
            ],
        });
        expect(updated.roles).toEqual([
            "issuance:offer",
            "presentation:request",
        ]);
    });
});

describe("KeycloakUsersProvider.addUser", () => {
    it("keeps Keycloak's default roles of the new user", async () => {
        const { users, kc } = provider({
            id: "u1",
            username: "alice",
            attributes: { tenant_id: ["tenant-1"] },
        });
        kc.users.listRealmRoleMappings.mockResolvedValue([
            { id: "id-default-roles-eudiplo", name: "default-roles-eudiplo" },
        ]);

        await users.addUser("tenant-1", {
            username: "alice",
            roles: ["issuance:offer"] as never,
        });

        expect(kc.users.delRealmRoleMappings).not.toHaveBeenCalled();
        expect(kc.users.addRealmRoleMappings).toHaveBeenCalledWith({
            id: "u1",
            roles: [{ id: "id-issuance:offer", name: "issuance:offer" }],
        });
    });
});
