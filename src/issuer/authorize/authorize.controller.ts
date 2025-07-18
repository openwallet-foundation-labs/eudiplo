import { randomUUID } from 'node:crypto';
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthorizeService } from './authorize.service';
import { AuthorizeQueries } from './dto/authorize-request.dto';
import { SessionService } from '../../session/session.service';
import { ParResponseDto } from './dto/par-response.dto';
import { ApiBody } from '@nestjs/swagger';

/**
 * Controller for the OpenID4VCI authorization endpoints.
 * This controller handles the authorization requests, token requests.
 */
@Controller(':tenantId/authorize')
export class AuthorizeController {
    constructor(
        private readonly authorizeService: AuthorizeService,
        private sessionService: SessionService,
    ) {}

    /**
     * Endpoint to handle the Authorization Request.
     * @param queries
     * @param res
     */
    @Get()
    async authorize(
        @Query() queries: AuthorizeQueries,
        @Res() res: Response,
        @Param('tenantId') tenantId: string,
    ) {
        return this.authorizeService.sendAuthorizationResponse(
            queries,
            res,
            tenantId,
        );
    }

    /**
     * Endpoint to handle the Pushed Authorization Request (PAR).
     * @param body
     * @returns
     */
    @ApiBody({
        description: 'Pushed Authorization Request',
        type: AuthorizeQueries,
    })
    @Post('par')
    async par(
        @Body() body: AuthorizeQueries,
        @Param('tenantId') tenantId: string,
    ): Promise<ParResponseDto> {
        const request_uri = `urn:${randomUUID()}`;
        // save both so we can retrieve the session also via the request_uri in the authorize step.
        await this.sessionService.add(body.issuer_state!, tenantId, {
            request_uri,
            auth_queries: body,
        });
        return {
            expires_in: 500,
            request_uri,
        };
    }

    /**
     * Endpoint to validate the token request.
     * This endpoint is used to exchange the authorization code for an access token.
     * @param body
     * @param req
     * @returns
     */
    @Post('token')
    async token(
        @Body() body: any,
        @Req() req: Request,
        @Param('tenantId') tenantId: string,
    ): Promise<any> {
        //TODO: define body
        return this.authorizeService.validateTokenRequest(body, req, tenantId);
    }

    /**
     * Endpoint for the authorization challenge.
     * @param res
     * @param body
     * @returns
     */
    @Post('challenge')
    authorizationChallengeEndpoint(
        @Res() res: Response,
        @Body() body: AuthorizeQueries,
        @Param('tenantId') tenantId: string,
    ) {
        return this.authorizeService.authorizationChallengeEndpoint(
            res,
            body,
            tenantId,
        );
    }
}
