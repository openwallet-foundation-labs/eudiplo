import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "./role.enum.js";
import { ROLES_KEY, RoleRequirement } from "./roles.decorator.js";

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private readonly reflector: Reflector) {}

    canActivate(context: ExecutionContext): boolean {
        // A handler's requirement replaces the controller's, roles and match together.
        const requirement = this.reflector.getAllAndOverride<RoleRequirement>(
            ROLES_KEY,
            [context.getHandler(), context.getClass()],
        );
        if (!requirement) {
            return true;
        }
        const { user } = context.switchToHttp().getRequest();
        const granted = (role: Role) => user.roles?.includes(role) ?? false;
        // An empty list denies in both modes; `[].every()` alone would allow.
        return requirement.match === "all"
            ? requirement.roles.length > 0 && requirement.roles.every(granted)
            : requirement.roles.some(granted);
    }
}
