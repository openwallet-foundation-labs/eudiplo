import {
    CanActivate,
    ExecutionContext,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { SessionService } from './session.service';
import { ConfigService } from '@nestjs/config/dist/config.service';

@Injectable()
export class SessionGuard implements CanActivate {
    constructor(
        private readonly sessionService: SessionService,
        private configService: ConfigService,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // if not enabled, skip the guard
        if (!this.configService.get<boolean>('LOG_ENABLE_SESSION_LOGGER')) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const sessionId = request.params.session;
        if (!sessionId) {
            throw new NotFoundException(
                'Session ID not found in request parameters',
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
