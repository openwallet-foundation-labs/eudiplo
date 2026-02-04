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
import { ApiExcludeController, ApiParam, ApiTags } from "@nestjs/swagger";
import type { CredentialResponse } from "@openid4vc/openid4vci";
import type { Request } from "express";
import { SessionLogger } from "../../../shared/utils/logger/session-logger.decorator";
import { SessionLoggerInterceptor } from "../../../shared/utils/logger/session-logger.interceptor";
import { NotificationRequestDto } from "./dto/notification-request.dto";
import { Oid4vciService } from "./oid4vci.service";

/**
 * Controller for handling OID4VCI (OpenID for Verifiable Credential Issuance) requests.
 */
@ApiTags("OID4VCI")
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
        //TODO: maybe also add it into the header, see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-nonce-response
        return this.oid4vciService.nonceRequest(tenantId).then((nonce) => ({
            c_nonce: nonce,
        }));
    }
}
