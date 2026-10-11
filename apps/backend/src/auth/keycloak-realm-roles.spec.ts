import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import { describe, expect, it, vi } from "vitest";
import { syncEudiploRealmRoles } from "./keycloak-realm-roles.js";
import type { Role } from "./roles/role.enum.js";

const role = (name: string) => ({ id: `id-${name}`, name });

function keycloak(realmRoles: string[], mapped: string[]) {
    const kc = {
        roles: { find: vi.fn().mockResolvedValue(realmRoles.map(role)) },
        users: {
            listRealmRoleMappings: vi.fn().mockResolvedValue(mapped.map(role)),
            addRealmRoleMappings: vi.fn(),
            delRealmRoleMappings: vi.fn(),
        },
    };
    return { kc, admin: kc as unknown as KeycloakAdminClient };
}

describe("syncEudiploRealmRoles", () => {
    it("removes every EUDIPLO role but keeps the default roles for no roles", async () => {
        const { kc, admin } = keycloak(
            ["issuance:offer", "clients:manage", "default-roles-eudiplo"],
            ["issuance:offer", "clients:manage", "default-roles-eudiplo"],
        );

        await syncEudiploRealmRoles(admin, "u1", []);

        expect(kc.users.delRealmRoleMappings).toHaveBeenCalledWith({
            id: "u1",
            roles: [role("issuance:offer"), role("clients:manage")],
        });
        expect(kc.users.addRealmRoleMappings).not.toHaveBeenCalled();
    });

    it("skips a requested role the realm does not have", async () => {
        const { kc, admin } = keycloak(["issuance:offer"], ["issuance:offer"]);

        await syncEudiploRealmRoles(admin, "u1", [
            "issuance:offer",
            "presentation:request",
        ] as Role[]);

        expect(kc.users.addRealmRoleMappings).not.toHaveBeenCalled();
        expect(kc.users.delRealmRoleMappings).not.toHaveBeenCalled();
    });

    it("changes nothing when the EUDIPLO roles already match", async () => {
        const { kc, admin } = keycloak(
            ["issuance:offer", "offline_access"],
            ["issuance:offer", "offline_access"],
        );

        await syncEudiploRealmRoles(admin, "u1", ["issuance:offer"] as Role[]);

        expect(kc.users.addRealmRoleMappings).not.toHaveBeenCalled();
        expect(kc.users.delRealmRoleMappings).not.toHaveBeenCalled();
    });
});
