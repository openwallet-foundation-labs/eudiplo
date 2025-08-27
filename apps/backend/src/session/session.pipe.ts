import { Injectable, NotFoundException, PipeTransform } from "@nestjs/common";
import { Session } from "./entities/session.entity";
import { SessionService } from "./session.service";

@Injectable()
export class SessionPipe implements PipeTransform<string, Promise<Session>> {
    constructor(private readonly sessionService: SessionService) {}

    async transform(sessionId: string): Promise<Session> {
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

        // Return the entity so the controller parameter receives it
        return session;
    }
}
