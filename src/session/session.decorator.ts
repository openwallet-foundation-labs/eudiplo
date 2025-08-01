import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Session } from './entities/session.entity';

export const SessionEntity = createParamDecorator(
    (data: unknown, ctx: ExecutionContext) => {
        const request = ctx.switchToHttp().getRequest();
        return request.session as Session;
    },
);
