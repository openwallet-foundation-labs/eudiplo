import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Token = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.user as TokenPayload; // Access the token payload on the request object
    },
);

export interface TokenPayload {
    sub: string; // Subject (client_id for client credentials)

    // Standard JWT claims
    aud?: string | string[];
    exp?: number;
    iat?: number;
    iss?: string;

    // Client credentials specific claims
    client_id?: string;
    client_name?: string;
    grant_type?: 'client_credentials';
    roles?: string[];

    // Keycloak specific claims (for multi-tenant mode)
    preferred_username?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    given_name?: string;
    family_name?: string;
    azp?: string; // Authorized party (client_id)
    realm_access?: {
        roles: string[];
    };
    resource_access?: {
        [key: string]: {
            roles: string[];
        };
    };

    // Allow for additional claims
    [key: string]: any;
}
