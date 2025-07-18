import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Res,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBody,
    ApiProduces,
    ApiResponse,
    ApiSecurity,
    ApiTags,
} from '@nestjs/swagger';
import { PresentationsService } from './presentations.service';
import { PresentationConfig } from './entities/presentation-config.entity';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { Token, TokenPayload } from '../../auth/token.decorator';
import { OfferResponse } from '../../issuer/oid4vci/dto/offer-request.dto';
import {
    PresentationRequest,
    ResponseType,
} from '../oid4vp/dto/presentation-request.dto';
import { Oid4vpService } from '../oid4vp/oid4vp.service';
import * as QRCode from 'qrcode';
import { Response } from 'express';

@ApiTags('Presentation management', 'Admin')
@UseGuards(JwtAuthGuard)
@ApiSecurity('bearer')
@Controller('presentation-management')
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
    @ApiBody({
        type: PresentationRequest,
        examples: {
            qrcode: {
                summary: 'QR-Code Example',
                value: {
                    response_type: ResponseType.QRCode,
                    requestId: 'pid',
                },
            },
            uri: {
                summary: 'URI',
                value: {
                    response_type: ResponseType.URI,
                    requestId: 'pid',
                },
            },
        },
    })
    @Post('request')
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
            user.sub,
        );
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
     * Returns the presentation request configurations.
     * @returns
     */
    @Get()
    configuration(@Token() user: TokenPayload) {
        return this.presentationsService.getPresentationConfigs(user.sub);
    }

    /**
     * Store a presentation request configuration. If it already exists, it will be updated.
     * @param config
     * @returns
     */
    @Post()
    storePresentationConfig(
        @Body() config: PresentationConfig,
        @Token() user: TokenPayload,
    ) {
        return this.presentationsService.storePresentationConfig(
            config,
            user.sub,
        );
    }

    /**
     * Deletes a presentation request configuration by its ID.
     * @param id
     * @returns
     */
    @Delete(':id')
    deleteConfiguration(@Param('id') id: string, @Token() user: TokenPayload) {
        return this.presentationsService.deletePresentationConfig(id, user.sub);
    }
}
