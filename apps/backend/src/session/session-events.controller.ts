import {
    Controller,
    Get,
    Logger,
    NotFoundException,
    Param,
    Query,
    Sse,
    UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Observable, startWith } from "rxjs";
import { JwtService } from "../auth/jwt.service";
import { SessionEventsService } from "./session-events.service";
import { SessionService } from "./session.service";

/**
 * Controller for Server-Sent Events (SSE) based session status updates.
 * Provides real-time session status notifications as an alternative to polling.
 *
 * Authentication is required via JWT token passed as a query parameter.
 * This is necessary because the browser's EventSource API does not support
 * custom headers.
 *
 * @example
 * ```typescript
 * // Client-side usage
 * const token = await getAuthToken();
 * const eventSource = new EventSource(
 *   `/session/${sessionId}/events?token=${token}`
 * );
 *
 * eventSource.onmessage = (event) => {
 *   const data = JSON.parse(event.data);
 *   console.log('Session status:', data.status);
 * };
 *
 * eventSource.onerror = (error) => {
 *   console.error('SSE error:', error);
 *   eventSource.close();
 * };
 * ```
 */
@ApiTags("Session Events")
@Controller("session")
export class SessionEventsController {
    private readonly logger = new Logger(SessionEventsController.name);

    constructor(
        private readonly sessionEventsService: SessionEventsService,
        private readonly sessionService: SessionService,
        private readonly jwtService: JwtService,
    ) {}

    /**
     * Subscribe to real-time session status updates via Server-Sent Events.
     *
     * This endpoint requires JWT authentication via the `token` query parameter.
     * The EventSource API in browsers doesn't support custom headers, so the
     * token must be passed as a query parameter.
     *
     * The stream emits events whenever the session status changes:
     * - active: Session created, waiting for wallet interaction
     * - fetched: Credential offer/presentation request fetched by wallet
     * - completed: Session successfully completed
     * - expired: Session expired
     * - failed: Session failed
     *
     * @param id - The session ID to subscribe to
     * @param token - JWT access token for authentication
     * @returns Observable stream of session status events
     */
    @Get(":id/events")
    @Sse()
    @ApiOperation({
        summary: "Subscribe to session status updates",
        description:
            "Server-Sent Events endpoint for real-time session status updates. " +
            "Requires JWT authentication via query parameter.",
    })
    @ApiParam({
        name: "id",
        description: "Session ID to subscribe to",
        type: String,
    })
    @ApiQuery({
        name: "token",
        description: "JWT access token for authentication",
        required: true,
        type: String,
    })
    async subscribeToSessionEvents(
        @Param("id") id: string,
        @Query("token") token: string,
    ): Promise<Observable<MessageEvent>> {
        // Validate JWT token
        if (!token) {
            throw new UnauthorizedException(
                "Authentication required. Provide a valid JWT token via the 'token' query parameter.",
            );
        }

        try {
            await this.jwtService.verifyToken(token);
        } catch (error) {
            this.logger.warn(`Invalid token for session ${id} SSE: ${error}`);
            throw new UnauthorizedException("Invalid or expired token");
        }

        // Verify session exists
        try {
            const session = await this.sessionService.get(id);

            this.logger.debug(`Client subscribed to session ${id} events`);

            // Return the event stream, starting with the current status
            return this.sessionEventsService.getSessionEvents(id).pipe(
                startWith(
                    new MessageEvent("message", {
                        data: JSON.stringify({
                            id: session.id,
                            status: session.status,
                            updatedAt: session.updatedAt.toISOString(),
                        }),
                    }),
                ),
            );
        } catch {
            throw new NotFoundException(`Session ${id} not found`);
        }
    }
}
