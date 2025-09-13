import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Res,
} from "@nestjs/common";
import { ApiBody, ApiProduces, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import * as QRCode from "qrcode";
import { Role } from "../../auth/roles/role.enum";
import { Secured } from "../../auth/secure.decorator";
import { Token, TokenPayload } from "../../auth/token.decorator";
import { OfferResponse } from "../../issuer/oid4vci/dto/offer-request.dto";
import {
    PresentationRequest,
    ResponseType,
} from "../oid4vp/dto/presentation-request.dto";
import { Oid4vpService } from "../oid4vp/oid4vp.service";
import { PresentationConfigCreateDto } from "./dto/presentation-config-create.dto";
import { PresentationsService } from "./presentations.service";

@ApiTags("Presentation management")
@Secured([Role.Presentations])
@Controller("presentation-management")
export class PresentationManagementController {
    constructor(
        private readonly presentationsService: PresentationsService,
        private readonly oid4vpService: Oid4vpService,
    ) {}

    /**
     * Create an presentation request that can be sent to the user
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
        type: PresentationRequest,
        examples: {
            qrcode: {
                summary: "QR-Code Example",
                value: {
                    response_type: ResponseType.QRCode,
                    requestId: "pid",
                },
            },
            uri: {
                summary: "URI",
                value: {
                    response_type: ResponseType.URI,
                    requestId: "pid",
                },
            },
            "dc-api": {
                summary: "DC API",
                value: {
                    response_type: ResponseType.DC_API,
                    requestId: "pid",
                },
            },
        },
    })
    @Post("request")
    async getOffer(
        @Res() res: Response,
        @Body() body: PresentationRequest,
        @Token() user: TokenPayload,
    ) {
        const values = await this.oid4vpService.createRequest(
            body.requestId,
            {
                webhook: body.webhook,
            },
            user.entity!.id,
            body.response_type === ResponseType.DC_API,
        );
        values.uri = `openid4vp://?${values.uri}`;
        if (body.response_type === ResponseType.QRCode) {
            // Generate QR code as a PNG buffer.
            const qrCodeBuffer = await QRCode.toBuffer(values.uri);

            // Set the response content type to image/png
            res.setHeader("Content-Type", "image/png");

            // Send the QR code image as the response
            res.send(qrCodeBuffer);
        } else {
            res.send(values);
        }
    }

    /**
     * Returns the presentation request configurations.
     * @returns
     */
    @Get()
    configuration(@Token() user: TokenPayload) {
        return this.presentationsService.getPresentationConfigs(
            user.entity!.id,
        );
    }

    /**
     * Store a presentation request configuration. If it already exists, it will be updated.
     * @param config
     * @returns
     */
    @Post()
    storePresentationConfig(
        @Body() config: PresentationConfigCreateDto,
        @Token() user: TokenPayload,
    ) {
        return this.presentationsService.storePresentationConfig(
            user.entity!.id,
            config,
        );
    }

    /**
     * Deletes a presentation request configuration by its ID.
     * @param id
     * @returns
     */
    @Delete(":id")
    deleteConfiguration(@Param("id") id: string, @Token() user: TokenPayload) {
        return this.presentationsService.deletePresentationConfig(
            id,
            user.entity!.id,
        );
    }
}
