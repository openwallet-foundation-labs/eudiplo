import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { JwtAuthGuard } from "./auth.guard.js";
import { Role } from "./roles/role.enum.js";
import { RoleMatch, Roles } from "./roles/roles.decorator.js";
import { RolesGuard } from "./roles/roles.guard.js";

/**
 * Requires a valid access token with `roles`: one of them by default, all of
 * them with `match: "all"`. On a handler it replaces the controller's roles.
 */
export function Secured(
    roles: Role[],
    { match = "any" }: { match?: RoleMatch } = {},
) {
    return applyDecorators(
        Roles(roles, match),
        UseGuards(JwtAuthGuard, RolesGuard),
        ApiSecurity("oauth2", roles),
    );
}
