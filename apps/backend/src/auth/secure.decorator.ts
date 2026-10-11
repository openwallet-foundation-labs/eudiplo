import { applyDecorators, UseGuards } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/constants.js";
import { MetadataScanner } from "@nestjs/core";
import { ApiSecurity } from "@nestjs/swagger";
import { JwtAuthGuard } from "./auth.guard.js";
import { Role } from "./roles/role.enum.js";
import { ROLES_KEY, RoleMatch, Roles } from "./roles/roles.decorator.js";
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
        ApiRoleSecurity(roles, match),
    );
}

/**
 * Documents `roles` as OpenAPI security the way RolesGuard checks them. The
 * scopes of one requirement object are all required, so with `match: "any"`
 * each role gets an object of its own and with `match: "all"` they share one.
 * @nestjs/swagger would list a controller's requirements next to a handler's,
 * while the guard lets the handler's roles replace the controller's, so on a
 * controller this writes to every route handler that has no roles of its own
 * instead. An inherited handler is the base class's function, so it would
 * carry the roles of every subclass.
 */
function ApiRoleSecurity(
    roles: Role[],
    match: RoleMatch,
): ClassDecorator & MethodDecorator {
    const requirements =
        match === "all" ? [roles] : roles.map((role) => [role]);
    // ApiSecurity keeps state between the targets it decorates: new ones per target.
    const security = () =>
        applyDecorators(
            ...requirements.map((scopes) => ApiSecurity({ oauth2: scopes })),
        );
    return (
        target: object,
        key?: string | symbol,
        descriptor?: PropertyDescriptor,
    ) => {
        if (key !== undefined && descriptor) {
            security()(target, key, descriptor);
            return;
        }
        const prototype = (target as { prototype: Record<string, object> })
            .prototype;
        for (const name of new MetadataScanner().getAllMethodNames(prototype)) {
            const handler = prototype[name];
            if (
                Reflect.hasMetadata(PATH_METADATA, handler) &&
                !Reflect.hasMetadata(ROLES_KEY, handler)
            ) {
                security()(prototype, name, { value: handler });
            }
        }
    };
}
