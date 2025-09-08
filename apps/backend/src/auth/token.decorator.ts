import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Role } from "./roles/role.enum";
import { TenantEntity } from "./tenant/entitites/tenant.entity";

/**
 * Token decorator
 */
export const Token = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user as TokenPayload; // Access the token payload on the request object
    },
);

/**
 * Values of the user token
 */
export interface TokenPayload {
    /**
     * Tenant entity
     */
    entity?: TenantEntity;

    /**
     * Role for the user
     */
    roles: Role[];
}

export interface InternalTokenPayload extends TokenPayload {
    /**
     * Tenant ID
     */
    tenant_id: string;
}
