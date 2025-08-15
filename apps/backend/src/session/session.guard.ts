import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { SessionService } from "./session.service";

@Injectable()
export class SessionGuard implements CanActivate {
    constructor(private readonly sessionService: SessionService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const sessionId = request.params.session;
        if (!sessionId) {
            throw new NotFoundException(
                "Session ID not found in request parameters",
            );
        }
        const session = await this.sessionService.get(sessionId);
        if (!session) {
            throw new NotFoundException(
                `Session with ID ${sessionId} not found`,
            );
        }
        request.session = session;
        return true;
    }
}
