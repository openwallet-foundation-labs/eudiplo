/**
 * ISO 18013-7 Annex C response endpoint.
 * Receives the HPKE-encrypted DeviceResponse from the browser (via DC API)
 * and forwards to Iso18013Service for decryption and verification.
 */
import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    HttpStatus,
    Param,
    Post,
} from "@nestjs/common";
import { ApiParam, ApiTags } from "@nestjs/swagger";
import { Iso18013Service } from "./iso18013.service.js";

@ApiTags("ISO 18013-7")
@Controller("presentations/:walletNonce/iso-18013-7")
@ApiParam({
    name: "walletNonce",
    required: true,
    description:
        "The `walletNonce` from the offer's `org_iso_mdoc.response_uri`; the session ID is not accepted.",
})
export class Iso18013Controller {
    constructor(private readonly iso18013Service: Iso18013Service) {}

    /**
     * Accept the HPKE-encrypted DeviceResponse from the wallet (via DC API + browser JS).
     * Body: { data: string }  — base64url-encoded HPKE output (enc || ciphertext)
     */
    @Post()
    @HttpCode(HttpStatus.OK)
    async handleResponse(
        @Param("walletNonce") walletNonce: string,
        @Body() body: { data?: string },
    ): Promise<Record<string, unknown>> {
        if (!body?.data) {
            throw new BadRequestException("Missing data field");
        }
        return this.iso18013Service.processResponse(walletNonce, body.data);
    }
}
