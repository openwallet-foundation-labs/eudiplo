import {
    Body,
    Controller,
    Get,
    Post,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { Oid4vpService } from './oid4vp.service';
import { AuthorizationResponse } from './dto/authorization-response.dto';
import { SessionLogger } from '../../utils/logger/session-logger.decorator';
import { SessionLoggerInterceptor } from '../../utils/logger/session-logger.interceptor';
import { SessionEntity } from '../../session/session.decorator';
import { Session } from '../../session/entities/session.entity';
import { SessionGuard } from '../../session/session.guard';

/**
 * Controller for handling OID4VP (OpenID for Verifiable Presentations) requests.
 */
@Controller('oid4vp')
@UseGuards(SessionGuard)
@UseInterceptors(SessionLoggerInterceptor)
export class Oid4vpController {
    /**
     * Constructor for the Oid4vpController.
     * @param oid4vpService - Instance of Oid4vpService for handling OID4VP operations.
     */
    constructor(private readonly oid4vpService: Oid4vpService) {}

    /**
     * Returns the authorization request for a given requestId and session.
     * @param requestId
     * @param session
     * @returns
     */
    //TODO: we just need the session that will include the requestId.
    @Get('request/:session')
    @SessionLogger('session', 'OID4VP')
    getRequestWithSession(@SessionEntity() session: Session) {
        return this.oid4vpService.createAuthorizationRequest(session);
    }

    /**
     * Endpoint to receive the response from the wallet.
     * @param body
     * @returns
     */
    @Post('response/:session')
    @SessionLogger('state', 'OID4VP')
    getResponse(
        @Body() body: AuthorizationResponse,
        @SessionEntity() session: Session,
    ) {
        return this.oid4vpService.getResponse(body, session);
    }
}
