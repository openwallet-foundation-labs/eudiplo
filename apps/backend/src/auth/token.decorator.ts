import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { TenantEntity } from "./entitites/tenant.entity";

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
     * Subject (client_id for client credentials)
     */
    sub: string;
    /**
     * Admin flag
     */
    admin: boolean;
    /**
     * Tenant entity
     */
    entity?: TenantEntity;
}
