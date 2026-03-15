import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    UseInterceptors,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { SessionLogger } from "../../shared/utils/logger/session-logger.decorator";
import { SessionLoggerInterceptor } from "../../shared/utils/logger/session-logger.interceptor";
import { AuthorizationResponse } from "./dto/authorization-response.dto";
import { Oid4vpService } from "./oid4vp.service";

/**
 * Controller for handling OID4VP (OpenID for Verifiable Presentations) requests.
 */
@ApiTags("OID4VP")
@Controller("presentations/:sessionId/oid4vp")
@UseInterceptors(SessionLoggerInterceptor)
@ApiParam({ name: "sessionId", required: true })
export class Oid4vpController {
    /**
     * Constructor for the Oid4vpController.
     * @param oid4vpService - Instance of Oid4vpService for handling OID4VP operations.
     */
    constructor(private readonly oid4vpService: Oid4vpService) {}

    /**
     * Returns the authorization request for a given requestId and session.
     * @param session
     * @param req
     * @returns
     */
    @Get("request")
    @SessionLogger("sessionId", "OID4VP")
    getRequestWithSession(
        @Param("sessionId") sessionId: string,
        @Req() req: Request,
    ) {
        const origin = req.get("origin") as string;
        return this.oid4vpService.createAuthorizationRequest(sessionId, origin);
    }

    /**
     * Returns the authorization request for a given requestId and session, but does not redirect in the end.
     * @param sessionId
     * @param req
     * @returns
     */
    @Get("request/no-redirect")
    @SessionLogger("sessionId", "OID4VP")
    getRequestNoRedirectWithSession(
        @Param("sessionId") sessionId: string,
        @Req() req: Request,
    ) {
        const origin = req.get("origin") as string;
        return this.oid4vpService.createAuthorizationRequest(
            sessionId,
            origin,
            true,
        );
    }

    /**
     * Returns the authorization request for a given requestId and session.
     * @param sessionId
     * @param req
     * @returns
     */
    @Post("request")
    @SessionLogger("sessionId", "OID4VP")
    getPostRequestWithSession(
        @Param("sessionId") sessionId: string,
        @Req() req: Request,
    ) {
        const origin = req.get("origin") as string;
        return this.oid4vpService.createAuthorizationRequest(sessionId, origin);
    }

    /**
     * Endpoint to receive the response from the wallet.
     * @param body
     * @returns
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    @SessionLogger("sessionId", "OID4VP")
    getResponse(
        @Body() body: AuthorizationResponse,
        @Param("sessionId") sessionId: string,
    ) {
        return this.oid4vpService.getResponse(body, sessionId);
    }
}
