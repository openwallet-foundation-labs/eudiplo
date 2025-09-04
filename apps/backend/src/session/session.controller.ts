import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { Role } from "../auth/roles/role.enum";
import { Secured } from "../auth/secure.decorator";
import { Token, TokenPayload } from "../auth/token.decorator";
import { StatusUpdateDto } from "../issuer/status-list/dto/status-update.dto";
import { StatusListService } from "../issuer/status-list/status-list.service";
import { Session } from "./entities/session.entity";
import { SessionPipe } from "./session.pipe";
import { SessionService } from "./session.service";

@ApiTags("Session management")
@Secured([Role.IssuanceOffer, Role.PresentationOffer])
@Controller("session")
export class SessionController {
    constructor(
        private readonly sessionService: SessionService,
        private readonly statusListService: StatusListService,
    ) {}

    /**
     * Retrieves all sessions.
     */
    @Get()
    getAllSessions(): Promise<Session[]> {
        return this.sessionService.getAll();
    }

    /**
     * Retrieves the session information for a given session ID.
     * @param id - The identifier of the session.
     */
    @ApiParam({ name: "id", description: "The session ID", type: String })
    @Get(":id")
    getSession(@Param("id", SessionPipe) session: Session): Session {
        return session;
    }

    /**
     * Deletes a session by its ID
     * @param id
     * @param user
     * @returns
     */
    @Delete(":id")
    deleteSession(
        @Param("id") id: string,
        @Token() user: TokenPayload,
    ): Promise<void> {
        return this.sessionService.delete(id, user.entity!.id);
    }

    /**
     * Update the status of the credentials of a specific session.
     * @param value
     * @returns
     */
    @Post("revoke")
    revokeAll(@Body() value: StatusUpdateDto, @Token() user: TokenPayload) {
        return this.statusListService.updateStatus(value, user.entity!.id);
    }
}
