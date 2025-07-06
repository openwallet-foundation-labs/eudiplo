import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Oid4vpService } from './oid4vp.service';
import * as QRCode from 'qrcode';
import { Response } from 'express';
import { AuthorizationResponse } from './dto/authorization-response.dto';
import {
  PresentationRequest,
  ResponseType,
} from './dto/presentation-request.dto';

@Controller('oid4vp')
export class Oid4vpController {
  constructor(private readonly oid4vpService: Oid4vpService) {}

  @Post()
  async getOffer(@Res() res: Response, @Body() body: PresentationRequest) {
    const url = `openid4vp://?${await this.oid4vpService.createRequest(body.requestId, { webhook: body.webhook })}`;
    if (body.response_type === ResponseType.QRCode) {
      // Generate QR code as a PNG buffer
      const qrCodeBuffer = await QRCode.toBuffer(url);

      // Set the response content type to image/png
      res.setHeader('Content-Type', 'image/png');

      // Send the QR code image as the response
      res.send(qrCodeBuffer);
    } else {
      res.send({
        request: url,
      });
    }
  }

  @Get('request/:requestId')
  getRequest(@Param('requestId') requestId: string) {
    return this.oid4vpService.createAuthorizationRequest(requestId);
  }

  @Get('request/:requestId/:session')
  getRequestWithSession(
    @Param('requestId') requestId: string,
    @Param('session') session: string,
  ) {
    return this.oid4vpService.createAuthorizationRequest(requestId, session);
  }

  @Post('response')
  getResponse(@Body() body: AuthorizationResponse) {
    return this.oid4vpService.getResponse(body);
  }
}
