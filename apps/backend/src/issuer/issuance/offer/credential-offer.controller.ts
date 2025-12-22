import { Body, Controller, Post, Res } from "@nestjs/common";
import { ApiBody, ApiProduces, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import * as QRCode from "qrcode";
import { Role } from "../../../auth/roles/role.enum";
import { Secured } from "../../../auth/secure.decorator";
import { Token, TokenPayload } from "../../../auth/token.decorator";
import { ResponseType } from "../../../verifier/oid4vp/dto/presentation-request.dto";
import {
    FlowType,
    OfferRequestDto,
    OfferResponse,
} from "../oid4vci/dto/offer-request.dto";
import { Oid4vciService } from "../oid4vci/oid4vci.service";

@ApiTags("Issuer")
@Secured([Role.IssuanceOffer])
@Controller("issuer/offer")
export class CredentialOfferController {
    constructor(private readonly oid4vciService: Oid4vciService) {}

    /**
     * Create an offer for a credential.
     * @param res
     * @param body
     */
    @ApiResponse({
        description: "JSON response",
        status: 201,
        //TODO: do not use type, otherwhise the response can not deal with both JSON and PNG.
        type: OfferResponse,
        content: {
            "application/json": { schema: { type: "object" } },
            "image/png": { schema: { type: "string", format: "binary" } },
        },
    })
    @ApiProduces("application/json", "image/png")
    @ApiBody({
        type: OfferRequestDto,
        examples: {
            qrcode: {
                summary: "QR-Code Example",
                value: {
                    response_type: ResponseType.QRCode,
                    credentialConfigurationIds: ["pid"],
                    flow: FlowType.PRE_AUTH_CODE,
                } as OfferRequestDto,
            },
            uri: {
                summary: "URI",
                value: {
                    response_type: ResponseType.URI,
                    credentialConfigurationIds: ["pid"],
                    flow: FlowType.PRE_AUTH_CODE,
                } as OfferRequestDto,
            },
        },
    })
    @Post()
    async getOffer(
        @Res() res: Response,
        @Body() body: OfferRequestDto,
        @Token() user: TokenPayload,
    ) {
        // For now, we'll just pass the body to the service as before
        // You can modify the service later to accept user information if needed
        const values = await this.oid4vciService.createOffer(
            body,
            user,
            user.entity!.id,
        );

        if (body.response_type === ResponseType.QRCode) {
            // Generate QR code as a PNG buffer
            const qrCodeBuffer = await QRCode.toBuffer(values.uri);

            // Set the response content type to image/png
            res.setHeader("Content-Type", "image/png");

            // Send the QR code image as the response
            res.send(qrCodeBuffer);
        } else {
            res.send(values);
        }
    }
}
