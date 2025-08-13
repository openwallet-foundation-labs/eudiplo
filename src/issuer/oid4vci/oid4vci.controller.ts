import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { ApiExcludeController, ApiParam } from '@nestjs/swagger';
import type { CredentialResponse } from '@openid4vc/openid4vci';
import type { Request } from 'express';
import { Oid4vciService } from '../../issuer/oid4vci/oid4vci.service';
import { Session } from '../../session/entities/session.entity';
import { SessionEntity } from '../../session/session.decorator';
import { SessionGuard } from '../../session/session.guard';
import { SessionLogger } from '../../utils/logger//session-logger.decorator';
import { SessionLoggerInterceptor } from '../../utils/logger/session-logger.interceptor';
import { NotificationRequestDto } from './dto/notification-request.dto';

/**
 * Controller for handling OID4VCI (OpenID for Verifiable Credential Issuance) requests.
 */
@ApiParam({ name: 'session', required: true })
@ApiExcludeController(process.env.SWAGGER_ALL !== 'true')
@UseGuards(SessionGuard)
@Controller(':session/vci')
@UseInterceptors(SessionLoggerInterceptor)
export class Oid4vciController {
    constructor(private readonly oid4vciService: Oid4vciService) {}

    /**
     * Endpoint to issue credentials
     * @param req
     * @returns
     */
    @Post('credential')
    @SessionLogger('session', 'OID4VCI')
    credential(
        @Req() req: Request,
        @SessionEntity() session: Session,
    ): Promise<CredentialResponse> {
        return this.oid4vciService.getCredential(req, session);
    }

    /**
     * Notification endpoint
     * @param body
     * @returns
     */
    @Post('notification')
    @SessionLogger('notification_id', 'OID4VCI')
    notifications(
        @Body() body: NotificationRequestDto,
        @Req() req: Request,
        @SessionEntity() session: Session,
    ) {
        return this.oid4vciService.handleNotification(req, body, session);
    }

    @Post('nonce')
    @SessionLogger('nonce', 'OID4VCI')
    nonce(@SessionEntity() session: Session) {
        return this.oid4vciService.nonceRequest(session);
    }

    //TODO: this endpoint may be relevant for the wallet attestation.
    /* @Get('session')
  session() {
    console.log('Session requested');
    //TODO store session and created at
    const session = randomUUID();
    return {
      session_id: session,
    };
  } */
}
