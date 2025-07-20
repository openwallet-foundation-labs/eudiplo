import { Controller, Get, Param, Post, UseGuards, Body } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { Session } from './entities/session.entity';
import { JwtAuthGuard } from '../auth/auth.guard';
import { Token, TokenPayload } from '../auth/token.decorator';
import { StatusUpdateDto } from '../issuer/status-list/dto/status-update.dto';
import { StatusListService } from '../issuer/status-list/status-list.service';

@ApiTags('Session management', 'Admin')
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
     */ @Get()
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
     * Update the status of the credentials of a specific session.
     * @param value
     * @returns
     */
    @Post('revoke')
    revokeAll(@Body() value: StatusUpdateDto, @Token() user: TokenPayload) {
        return this.statusListService.updateStatus(value, user.sub);
    }
}
