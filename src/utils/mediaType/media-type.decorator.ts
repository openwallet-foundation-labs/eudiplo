import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ContentType = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.headers['content-type'] as string | undefined;
    },
);
