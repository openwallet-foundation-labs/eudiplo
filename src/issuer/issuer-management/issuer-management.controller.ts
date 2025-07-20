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
import { CredentialsService } from '../credentials/credentials.service';
import {
    ApiBody,
    ApiProduces,
    ApiResponse,
    ApiSecurity,
    ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { Token, TokenPayload } from '../../auth/token.decorator';
import { IssuanceConfig } from '../../issuer/credentials/entities/issuance-config.entity';
import { Oid4vciService } from '../../issuer/oid4vci/oid4vci.service';
import { OfferResponse, OfferRequest } from '../oid4vci/dto/offer-request.dto';
import { ResponseType } from '../../verifier/oid4vp/dto/presentation-request.dto';
import * as QRCode from 'qrcode';
import { Response } from 'express';

@ApiTags('Issuer management', 'Admin')
@UseGuards(JwtAuthGuard)
@ApiSecurity('oauth2')
@Controller('issuer-management')
export class IssuerManagementController {
    constructor(
        private readonly credentialsService: CredentialsService,
        private readonly oid4vciService: Oid4vciService,
    ) {}

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
    @ApiBody({
        type: OfferRequest,
        examples: {
            qrcode: {
                summary: 'QR-Code Example',
                value: {
                    response_type: ResponseType.QRCode,
                    credentialConfigurationIds: ['pid'],
                } as OfferRequest,
            },
            uri: {
                summary: 'URI',
                value: {
                    response_type: ResponseType.URI,
                    credentialConfigurationIds: ['pid'],
                } as OfferRequest,
            },
        },
    })
    @Post('offer')
    async getOffer(
        @Res() res: Response,
        @Body() body: OfferRequest,
        @Token() user: TokenPayload,
    ) {
        // For now, we'll just pass the body to the service as before
        // You can modify the service later to accept user information if needed
        const values = await this.oid4vciService.createOffer(
            body,
            user,
            user.sub,
        );

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
     * Returns the credential configuration for all supported credentials.
     * @returns
     */
    @Get()
    configuration(@Token() user: TokenPayload) {
        return this.credentialsService.getConfig(user.sub);
    }

    /**
     * Stores a credential configuration. If it already exists, it will be updated.
     * @param config
     * @returns
     */
    @Post()
    storeConfiguration(
        @Body() config: IssuanceConfig,
        @Token() user: TokenPayload,
    ) {
        return this.credentialsService.storeCredentialConfiguration(
            user.sub,
            config,
        );
    }

    /**
     * Deletes a credential configuration by its ID.
     * @param id
     * @returns
     */
    @Delete('/:id')
    deleteConfiguration(@Param('id') id: string, @Token() user: TokenPayload) {
        return this.credentialsService.deleteCredentialConfiguration(
            user.sub,
            id,
        );
    }
}
