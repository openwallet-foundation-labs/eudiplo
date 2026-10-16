import type KeycloakAdminClient from "@keycloak/keycloak-admin-client";
import type RoleRepresentation from "@keycloak/keycloak-admin-client/lib/defs/roleRepresentation.js";
import { isRole } from "./roles/role.enum.js";

/** The Keycloak client whose roles administer the realm. */
const REALM_MANAGEMENT = "realm-management";

/**
 * Roles of a Keycloak user or service account for the check before it is
 * changed:
 * - its effective EUDIPLO realm roles, including those from groups and
 *   composite roles;
 * - its effective `realm-management` roles, which administer Keycloak, also
 *   from groups and composite roles;
 * - every other client role mapped to it directly.
 *
 * Client roles are returned as `<client>/<role>`. A tenant caller never holds
 * such a name, so an account with them cannot be taken over. Other realm
 * roles, such as Keycloak's default roles, are left out.
 */
export async function keycloakAuthorizationRoles(
    kc: KeycloakAdminClient,
    userId: string,
): Promise<string[]> {
    const realmManagement = (
        await kc.clients.find({ clientId: REALM_MANAGEMENT })
    )[0];
    const [realmRoles, mappings, adminRoles] = await Promise.all([
        kc.users.listCompositeRealmRoleMappings({ id: userId }),
        kc.users.listRoleMappings({ id: userId }),
        realmManagement?.id
            ? kc.users.listCompositeClientRoleMappings({
                  id: userId,
                  clientUniqueId: realmManagement.id,
              })
            : Promise.resolve([]),
    ]);
    const clientMappings = Object.values(mappings.clientMappings ?? {}) as {
        client?: string;
        mappings?: RoleRepresentation[];
    }[];
    const names = (client: string | undefined, roles: RoleRepresentation[]) =>
        roles.flatMap((role) => (role.name ? [`${client}/${role.name}`] : []));
    return [
        ...new Set([
            ...realmRoles.flatMap((role) =>
                isRole(role.name) ? [role.name] : [],
            ),
            ...names(REALM_MANAGEMENT, adminRoles),
            ...clientMappings.flatMap(({ client, mappings: roles }) =>
                names(client, roles ?? []),
            ),
        ]),
    ];
}
