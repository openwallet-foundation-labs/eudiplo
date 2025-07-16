import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { CredentialResponse } from '@openid4vc/openid4vci';
import type { Request, Response } from 'express';
import * as QRCode from 'qrcode';
import { Oid4vciService } from '../../issuer/oid4vci/oid4vci.service';
import { OfferRequest, OfferResponse } from './dto/offer-request.dto';
import { ResponseType } from '../../verifier/oid4vp/dto/presentation-request.dto';
import { ApiProduces, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { NotificationRequestDto } from './dto/notification-request.dto';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { Token, TokenPayload } from '../../auth/token.decorator';

@Controller('vci')
export class Oid4vciController {
    constructor(private readonly oid4vciService: Oid4vciService) {}

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
    @UseGuards(JwtAuthGuard)
    @ApiSecurity('bearer')
    @Post('offer')
    async getOffer(
        @Res() res: Response,
        @Body() body: OfferRequest,
        @Token() user: TokenPayload,
    ) {
        // For now, we'll just pass the body to the service as before
        // You can modify the service later to accept user information if needed
        const values = await this.oid4vciService.createOffer(body, user);

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
     * Endpoint to issue credentials
     * @param req
     * @returns
     */
    @Post('credential')
    credential(@Req() req: Request): Promise<CredentialResponse> {
        return this.oid4vciService.getCredential(req);
    }

    //TODO: this endpoint may be relevant for the wallet attestation.
    /* @Get('session')
  session() {
    console.log('Session requested');
    //TODO store session and created at
    const session = randomUUID();
    return {
      session_id: session,
    };
  } */

    /**
     * Notification endpoint
     * @param body
     * @returns
     */
    @Post('notification')
    notifications(@Body() body: NotificationRequestDto, @Req() req: Request) {
        return this.oid4vciService.handleNotification(req, body);
    }
}
