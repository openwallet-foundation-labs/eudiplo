import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    UseInterceptors,
} from '@nestjs/common';
import { Oid4vpService } from './oid4vp.service';
import { AuthorizationResponse } from './dto/authorization-response.dto';
import { SessionLogger } from '../../utils/session-logger.decorator';
import { SessionLoggerInterceptor } from '../../utils/session-logger.interceptor';

/**
 * Controller for handling OID4VP (OpenID for Verifiable Presentations) requests.
 */
@Controller(':tenantId/oid4vp')
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
    @Get('request/:requestId/:session')
    @SessionLogger('session', 'OID4VP')
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
    @SessionLogger('state', 'OID4VP')
    getResponse(
        @Body() body: AuthorizationResponse,
        @Param('tenantId') tenantId: string,
    ) {
        return this.oid4vpService.getResponse(body, tenantId);
    }
}
