import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { SessionService } from './session.service';
import { Session } from './entities/session.entity';
import { JwtAuthGuard } from '../auth/auth.guard';

@UseGuards(JwtAuthGuard)
@ApiSecurity('bearer')
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
