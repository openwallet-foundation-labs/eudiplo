import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import type { CredentialResponse } from '@openid4vc/openid4vci';
import type { Request, Response } from 'express';
import * as QRCode from 'qrcode';
import { Oid4vciService } from 'src/issuer/oid4vci/oid4vci.service';
import { OfferRequest } from './dto/offer-request.dto';
import { ResponseType } from 'src/verifier/oid4vp/dto/presentation-request.dto';

@Controller('vci')
export class Oid4vciController {
  constructor(private readonly oid4vciService: Oid4vciService) {}

  @Post('offer')
  async getOffer(@Res() res: Response, @Body() body: OfferRequest) {
    const url = await this.oid4vciService.createOffer(body);
    if (body.response_type === ResponseType.QRCode) {
      // Generate QR code as a PNG buffer
      const qrCodeBuffer = await QRCode.toBuffer(url);

      // Set the response content type to image/png
      res.setHeader('Content-Type', 'image/png');

      // Send the QR code image as the response
      res.send(qrCodeBuffer);
    } else {
      res.send({
        offer: url,
      });
    }
  }

  @Post('credential')
  credential(@Req() req: Request): Promise<CredentialResponse> {
    return this.oid4vciService.getCredential(req);
  }

  /* @Get('session')
  session() {
    console.log('Session requested');
    //TODO store session and created at
    const session = randomUUID();
    return {
      session_id: session,
    };
  } */

  @Post('notification')
  notification(@Body() body: any) {
    //TODO: not implemented in the wallet yet.
    console.log('Notification received:');
    console.log(body);
  }
}
