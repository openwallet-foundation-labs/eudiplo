import { applyDecorators, Param } from "@nestjs/common";
import { SessionPipe } from "./session.pipe";

export function SessionEntity(): ParameterDecorator {
    return applyDecorators(
        Param("session", SessionPipe) as any,
    ) as ParameterDecorator;
}
