import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Oid4vpService } from './oid4vp.service';
import { AuthorizationResponse } from './dto/authorization-response.dto';

@Controller(':tenantId/oid4vp')
export class Oid4vpController {
    constructor(private readonly oid4vpService: Oid4vpService) {}

    /**
     * Returns the authorization request for a given requestId and session.
     * @param requestId
     * @param session
     * @returns
     */
    @Get('request/:requestId/:session')
    getRequestWithSession(
        @Param('tenantId') tenantId: string,
        @Param('requestId') requestId: string,
        @Param('session') session: string,
    ) {
        return this.oid4vpService.createAuthorizationRequest(
            requestId,
            tenantId,
            session,
        );
    }

    /**
     * Endpoint to receive the response from the wallet.
     * @param body
     * @returns
     */
    @Post('response')
    getResponse(
        @Body() body: AuthorizationResponse,
        @Param('tenantId') tenantId: string,
    ) {
        return this.oid4vpService.getResponse(body, tenantId);
    }
}
