import {
    Body,
    Controller,
    Header,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    UseInterceptors,
} from "@nestjs/common";
import { ApiExcludeController, ApiParam } from "@nestjs/swagger";
import type { CredentialResponse } from "@openid4vc/openid4vci";
import type { Request } from "express";
import { Oid4vciService } from "../../issuer/oid4vci/oid4vci.service";
import { SessionLogger } from "../../utils/logger//session-logger.decorator";
import { SessionLoggerInterceptor } from "../../utils/logger/session-logger.interceptor";
import { NotificationRequestDto } from "./dto/notification-request.dto";

/**
 * Controller for handling OID4VCI (OpenID for Verifiable Credential Issuance) requests.
 */
@ApiParam({ name: "tenantId", required: true })
@ApiExcludeController(process.env.SWAGGER_ALL !== "true")
@Controller(":tenantId/vci")
@UseInterceptors(SessionLoggerInterceptor)
export class Oid4vciController {
    constructor(private readonly oid4vciService: Oid4vciService) {}

    /**
     * Endpoint to issue credentials
     * @param req
     * @returns
     */
    @Post("credential")
    @SessionLogger("session", "OID4VCI")
    @HttpCode(HttpStatus.OK)
    credential(
        @Req() req: Request,
        @Param("tenantId") tenantId: string,
    ): Promise<CredentialResponse> {
        return this.oid4vciService.getCredential(req, tenantId);
    }

    /**
     * Notification endpoint
     * @param body
     * @returns
     */
    @Post("notification")
    @SessionLogger("notification_id", "OID4VCI")
    notifications(
        @Body() body: NotificationRequestDto,
        @Req() req: Request,
        @Param("tenantId") tenantId: string,
    ) {
        return this.oid4vciService.handleNotification(req, body, tenantId);
    }

    @Post("nonce")
    @HttpCode(HttpStatus.OK)
    @Header("Cache-Control", "no-store")
    nonce(@Param("tenantId") tenantId: string) {
        return this.oid4vciService.nonceRequest(tenantId).then((nonce) => ({
            c_nonce: nonce,
        }));
    }
}
