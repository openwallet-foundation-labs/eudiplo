import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import type { CredentialResponse } from '@openid4vc/openid4vci';
import type { Request } from 'express';
import { Oid4vciService } from '../../issuer/oid4vci/oid4vci.service';
import { NotificationRequestDto } from './dto/notification-request.dto';

@Controller(':tenantId/vci')
export class Oid4vciController {
    constructor(private readonly oid4vciService: Oid4vciService) {}

    /**
     * Endpoint to issue credentials
     * @param req
     * @returns
     */
    @Post('credential')
    credential(
        @Req() req: Request,
        @Param('tenantId') tenantId: string,
    ): Promise<CredentialResponse> {
        return this.oid4vciService.getCredential(req, tenantId);
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

    /**
     * Notification endpoint
     * @param body
     * @returns
     */
    @Post('notification')
    notifications(
        @Body() body: NotificationRequestDto,
        @Req() req: Request,
        @Param('tenantId') tenantId: string,
    ) {
        return this.oid4vciService.handleNotification(req, body, tenantId);
    }
}
