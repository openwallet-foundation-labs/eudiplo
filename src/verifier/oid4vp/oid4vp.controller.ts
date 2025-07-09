import {
    Body,
    Controller,
    Get,
    Param,
    Post,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Oid4vpService } from './oid4vp.service';
import * as QRCode from 'qrcode';
import { Response } from 'express';
import { AuthorizationResponse } from './dto/authorization-response.dto';
import {
    PresentationRequest,
    ResponseType,
} from './dto/presentation-request.dto';
import { ApiProduces, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { OfferResponse } from '../../issuer/oid4vci/dto/offer-request.dto';
import { ApiKeyGuard } from '../../auth/api-key-guard';

@Controller('oid4vp')
export class Oid4vpController {
    constructor(private readonly oid4vpService: Oid4vpService) {}

    /**
     * Create an offer for a credential. This endpoint may be protected
     * @param res
     * @param body
     */
    @ApiResponse({
        description: 'JSON response',
        status: 201,
        //TODO: do not use type, otherwhise the response can not deal with both JSON and PNG.
        type: OfferResponse,
        content: {
            'application/json': { schema: { type: 'object' } },
            'image/png': { schema: { type: 'string', format: 'binary' } },
        },
    })
    @ApiProduces('application/json', 'image/png')
    @UseGuards(ApiKeyGuard)
    @ApiSecurity('apiKey')
    @Post()
    async getOffer(@Res() res: Response, @Body() body: PresentationRequest) {
        const values = await this.oid4vpService.createRequest(body.requestId, {
            webhook: body.webhook,
        });
        values.uri = `openid4vp://?${values.uri}`;
        if (body.response_type === ResponseType.QRCode) {
            // Generate QR code as a PNG buffer
            const qrCodeBuffer = await QRCode.toBuffer(values.uri);

            // Set the response content type to image/png
            res.setHeader('Content-Type', 'image/png');

            // Send the QR code image as the response
            res.send(qrCodeBuffer);
        } else {
            res.send(values);
        }
    }

    /**
     * Returns the authorization request for a given requestId and session.
     * @param requestId
     * @param session
     * @returns
     */
    @Get('request/:requestId/:session')
    getRequestWithSession(
        @Param('requestId') requestId: string,
        @Param('session') session: string,
    ) {
        return this.oid4vpService.createAuthorizationRequest(
            requestId,
            session,
        );
    }

    /**
     * Endpoint to receive the response from the wallet.
     * @param body
     * @returns
     */
    @Post('response')
    getResponse(@Body() body: AuthorizationResponse) {
        return this.oid4vpService.getResponse(body);
    }
}
