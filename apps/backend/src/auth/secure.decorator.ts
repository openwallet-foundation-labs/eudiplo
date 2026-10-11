import { applyDecorators, UseGuards } from "@nestjs/common";
import { PATH_METADATA } from "@nestjs/common/constants.js";
import { MetadataScanner } from "@nestjs/core";
import { ApiSecurity } from "@nestjs/swagger";
import { JwtAuthGuard } from "./auth.guard.js";
import { Role } from "./roles/role.enum.js";
import { ROLES_KEY, Roles } from "./roles/roles.decorator.js";
import { RolesGuard } from "./roles/roles.guard.js";

/**
 * Requires a valid access token that carries one of `roles`. On a handler it
 * replaces the controller's roles.
 */
export function Secured(roles: Role[]) {
    return applyDecorators(
        Roles(...roles),
        UseGuards(JwtAuthGuard, RolesGuard),
        ApiRoleSecurity(roles),
    );
}

/**
 * Documents `roles` as OpenAPI security the way RolesGuard checks them. The
 * scopes of one requirement object are all required, so each role gets an
 * object of its own. @nestjs/swagger would list a controller's requirements
 * next to a handler's, while the guard lets the handler's roles replace the
 * controller's, so on a controller this writes to every route handler that
 * has no roles of its own instead. An inherited handler is the base class's
 * function, so it would carry the roles of every subclass.
 */
function ApiRoleSecurity(roles: Role[]): ClassDecorator & MethodDecorator {
    // ApiSecurity keeps state between the targets it decorates: new ones per target.
    const security = () =>
        applyDecorators(
            ...roles.map((role) => ApiSecurity({ oauth2: [role] })),
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
