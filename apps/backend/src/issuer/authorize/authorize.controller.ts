import { randomUUID } from "node:crypto";
import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
    Res,
    UseGuards,
} from "@nestjs/common";
import { ApiBody, ApiExcludeController } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { Session } from "../../session/entities/session.entity";
import { SessionEntity } from "../../session/session.decorator";
import { SessionGuard } from "../../session/session.guard";
import { SessionService } from "../../session/session.service";
import { AuthorizeService } from "./authorize.service";
import { AuthorizeQueries } from "./dto/authorize-request.dto";
import { ParResponseDto } from "./dto/par-response.dto";

/**
 * Controller for the OpenID4VCI authorization endpoints.
 * This controller handles the authorization requests, token requests.
 */
@ApiExcludeController(process.env.SWAGGER_ALL !== "true")
@UseGuards(SessionGuard)
@Controller(":session/authorize")
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
    authorize(@Query() queries: AuthorizeQueries, @Res() res: Response) {
        return this.authorizeService.sendAuthorizationResponse(queries, res);
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
    @UseGuards(SessionGuard)
    @Post("token")
    token(
        @Body() body: any,
        @Req() req: Request,
        @SessionEntity() session: Session,
    ): Promise<any> {
        //TODO: define body
        return this.authorizeService.validateTokenRequest(body, req, session);
    }

    /**
     * Endpoint for the authorization challenge.
     * @param res
     * @param body
     * @returns
     */
    @UseGuards(SessionGuard)
    @Post("challenge")
    authorizationChallengeEndpoint(
        @Res() res: Response,
        @Body() body: AuthorizeQueries,
        @SessionEntity() session: Session,
    ) {
        return this.authorizeService.authorizationChallengeEndpoint(
            res,
            body,
            session,
        );
    }
}
