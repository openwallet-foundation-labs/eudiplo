import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const Token = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as TokenPayload; // Access the token payload on the request object
  }
);

/**
 * Values of the user token
 */
export interface TokenPayload {
  sub: string; // Subject (client_id for client credentials)
}
