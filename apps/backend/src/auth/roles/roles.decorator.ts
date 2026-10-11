import { SetMetadata } from "@nestjs/common";
import { Role } from "./role.enum.js";

export const ROLES_KEY = "roles";

/** `any`: one of the roles is enough. `all`: the token needs every role. */
export type RoleMatch = "any" | "all";

/** Role check of a handler or controller, read by the RolesGuard. */
export interface RoleRequirement {
    roles: Role[];
    match: RoleMatch;
}

export const Roles = (roles: Role[], match: RoleMatch) =>
    SetMetadata(ROLES_KEY, { roles, match } satisfies RoleRequirement);
