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
        users: {
            findOne: vi.fn().mockResolvedValue(user),
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
