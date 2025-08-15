import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Token, TokenPayload } from '../auth/token.decorator';
import { StatusUpdateDto } from '../issuer/status-list/dto/status-update.dto';
import { StatusListService } from '../issuer/status-list/status-list.service';
import { Session } from './entities/session.entity';
import { SessionService } from './session.service';

@ApiTags('Session management')
@UseGuards(JwtAuthGuard)
@ApiSecurity('oauth2')
@Controller('session')
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
    @Get(':id')
    getSession(@Param('id') id: string): Promise<Session> {
        return this.sessionService.get(id);
    }

    /**
     * Deletes a session by its ID.
     * @param id
     * @param user
     * @returns
     */
    @Delete(':id')
    deleteSession(
        @Param('id') id: string,
        @Token() user: TokenPayload,
    ): Promise<void> {
        return this.sessionService.delete(id, user.sub);
    }

    /**
     * Update the status of the credentials of a specific session.
     * @param value
     * @returns
     */
    @Post('revoke')
    revokeAll(@Body() value: StatusUpdateDto, @Token() user: TokenPayload) {
        return this.statusListService.updateStatus(value, user.sub);
    }
}
