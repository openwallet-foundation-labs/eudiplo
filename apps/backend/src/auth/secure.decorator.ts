import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiSecurity } from "@nestjs/swagger";
import { JwtAuthGuard } from "./auth.guard";
import { Role } from "./roles/role.enum";
import { Roles } from "./roles/roles.decorator";
import { RolesGuard } from "./roles/roles.guard";

export function Secured(roles: Role[]) {
    return applyDecorators(
        Roles(...roles),
        UseGuards(JwtAuthGuard, RolesGuard),
        ApiSecurity("oauth2", roles),
    );
}
