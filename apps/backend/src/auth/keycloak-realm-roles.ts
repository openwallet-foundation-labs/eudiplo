import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import { isRole, Role } from "./roles/role.enum.js";

/**
 * Replaces the EUDIPLO realm roles mapped directly to a Keycloak user or
 * service account with `roles`. Other realm roles, such as Keycloak's
 * `default-roles-<realm>`, stay mapped. Roles missing in the realm are
 * skipped.
 */
export async function syncEudiploRealmRoles(
    kc: KeycloakAdminClient,
    userId: string,
    roles: Role[],
): Promise<void> {
    const realmRoles = await kc.roles.find();
    const currentRoles = await kc.users.listRealmRoleMappings({ id: userId });

    const toRemove = currentRoles
        .filter((role) => isRole(role.name) && !roles.includes(role.name))
        .map((role) => ({ id: role.id!, name: role.name! }));

    const toAdd = roles
        .filter((role) => !currentRoles.some((cr) => cr.name === role))
        .map((role) => realmRoles.find((realmRole) => realmRole.name === role))
        .filter(
            (role): role is NonNullable<typeof role> =>
                !!role?.id && !!role?.name,
        )
        .map((role) => ({ id: role.id!, name: role.name! }));

    if (toRemove.length > 0) {
        await kc.users.delRealmRoleMappings({ id: userId, roles: toRemove });
    }

    if (toAdd.length > 0) {
        await kc.users.addRealmRoleMappings({ id: userId, roles: toAdd });
    }
}
