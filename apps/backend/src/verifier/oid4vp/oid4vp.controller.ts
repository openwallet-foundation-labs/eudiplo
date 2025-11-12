import {
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Post,
    Req,
    UseInterceptors,
} from "@nestjs/common";
import { ApiExcludeController, ApiParam } from "@nestjs/swagger";
import { Request } from "express";
import { Session } from "../../session/entities/session.entity";
import { SessionEntity } from "../../session/session.decorator";
import { SessionLogger } from "../../utils/logger/session-logger.decorator";
import { SessionLoggerInterceptor } from "../../utils/logger/session-logger.interceptor";
import { AuthorizationResponse } from "./dto/authorization-response.dto";
import { Oid4vpService } from "./oid4vp.service";

/**
 * Controller for handling OID4VP (OpenID for Verifiable Presentations) requests.
 */
@Controller(":session/oid4vp")
@UseInterceptors(SessionLoggerInterceptor)
@ApiParam({ name: "session", required: true })
@ApiExcludeController(process.env.SWAGGER_ALL !== "true")
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
    @SessionLogger("session", "OID4VP")
    getRequestWithSession(
        @SessionEntity() session: Session,
        @Req() req: Request,
    ) {
        const origin = req.get("origin") as string;
        return this.oid4vpService.createAuthorizationRequest(session, origin);
    }

    /**
     * Returns the authorization request for a given requestId and session.
     * @param session
     * @param req
     * @returns
     */
    @Post("request")
    @SessionLogger("session", "OID4VP")
    getPostRequestWithSession(
        @SessionEntity() session: Session,
        @Req() req: Request,
        @Body() body: AuthorizationResponse,
    ) {
        const origin = req.get("origin") as string;
        return this.oid4vpService.createAuthorizationRequest(session, origin);
    }

    /**
     * Endpoint to receive the response from the wallet.
     * @param body
     * @returns
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    @SessionLogger("session", "OID4VP")
    getResponse(
        @Body() body: AuthorizationResponse,
        @SessionEntity() session: Session,
    ) {
        return this.oid4vpService.getResponse(body, session).then(
            (res) => {
                console.log(res);
                return res;
            },
            (err) => {
                console.error(err);
                throw err;
            },
        );
    }
}
