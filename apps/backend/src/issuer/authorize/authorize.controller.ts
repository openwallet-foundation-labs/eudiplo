import { randomUUID } from "node:crypto";
import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Query,
    Req,
    Res,
} from "@nestjs/common";
import { ApiBody, ApiExcludeController } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { SessionService } from "../../session/session.service";
import { AuthorizeService } from "./authorize.service";
import { AuthorizeQueries } from "./dto/authorize-request.dto";
import { ParResponseDto } from "./dto/par-response.dto";

/**
 * Controller for the OpenID4VCI authorization endpoints.
 * This controller handles the authorization requests, token requests.
 */
@ApiExcludeController(process.env.SWAGGER_ALL !== "true")
@Controller(":tenantId/authorize")
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
        @Param("tenantId") tenantId: string,
    ) {
        const redirectUrl =
            await this.authorizeService.sendAuthorizationResponse(
                queries,
                tenantId,
            );
        res.redirect(redirectUrl);
    }

    /**
     * Endpoint to handle the Pushed Authorization Request (PAR).
     * @param body
     * @returns
     */
    @ApiBody({
        description: "Pushed Authorization Request",
        type: AuthorizeQueries,
    })
    @Post("par")
    async par(@Body() body: AuthorizeQueries): Promise<ParResponseDto> {
        const request_uri = `urn:${randomUUID()}`;
        // save both so we can retrieve the session also via the request_uri in the authorize step.
        await this.sessionService.add(body.issuer_state!, {
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
    @Post("token")
    token(
        @Body() body: any,
        @Req() req: Request,
        @Param("tenantId") tenantId: string,
    ): Promise<any> {
        return this.authorizeService.validateTokenRequest(body, req, tenantId);
    }

    /**
     * Endpoint for the authorization challenge.
     * @param res
     * @param body
     * @returns
     */
    @Post("challenge")
    authorizationChallengeEndpoint(
        @Req() req: Request,
        @Res() res: Response,
        @Body() body: AuthorizeQueries,
        @Param("tenantId") tenantId: string,
    ) {
        const origin = req.headers.origin || `https://${req.headers.host}`;
        return this.authorizeService.authorizationChallengeEndpoint(
            res,
            body,
            tenantId,
            origin,
        );
    }
}
