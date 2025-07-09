import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from 'src/auth/api-key-guard';
import { SessionService } from './session.service';
import { Session } from './entities/session.entity';

@UseGuards(ApiKeyGuard)
@ApiSecurity('apiKey')
@Controller('session')
export class SessionController {
    constructor(private readonly sessionService: SessionService) {}

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
}
