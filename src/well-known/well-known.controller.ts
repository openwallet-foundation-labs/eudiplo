import { Controller, Get, Header, Param } from '@nestjs/common';
import { WellKnownService } from './well-known.service';
import { JwksResponseDto } from './dto/jwks-response.dto';
import { Oauth2AuthorizationServerResponse } from './dto/oauth-authorization-server-response.dto';
import { ApiOperation, ApiProduces } from '@nestjs/swagger';
import { ContentType } from '../utils/mediaType/media-type.decorator';
import { MediaType } from '../utils/mediaType/media-type.enum';

/**
 * Controller for the OpenID4VCI well-known endpoints.
 */
@Controller(':tenantId/.well-known')
export class WellKnownController {
    /**
     * Constructor for WellKnownController.
     * @param wellKnownService
     */
    constructor(private readonly wellKnownService: WellKnownService) {}

    /**
     * Retrieves the OpenID4VCI issuer metadata for a given tenant.
     * @param tenantId
     * @param contentType
     * @returns
     */
    @ApiOperation({
        summary: 'Get OpenID4VCI issuer metadata',
        description: 'Returns the OpenID4VCI issuer metadata.',
    })
    //we can not set the accept in the apiheader via swagger.
    @ApiProduces(MediaType.APPLICATION_JSON, MediaType.APPLICATION_JWT)
    @Get('openid-credential-issuer')
    async issuerMetadata(
        @Param('tenantId') tenantId: string,
        @ContentType() contentType: MediaType,
    ) {
        return this.wellKnownService.getIssuerMetadata(tenantId, contentType);
    }

    /**
     * Authorization Server Metadata
     * @returns
     */
    @Get('oauth-authorization-server')
    authzMetadata(
        @Param('tenantId') tenantId: string,
    ): Oauth2AuthorizationServerResponse {
        return this.wellKnownService.getAuthzMetadata(tenantId);
    }

    /**
     * Returns the JSON Web Key Set (JWKS) for the authorization server.
     * @returns
     */
    @Header('Content-Type', 'application/jwk-set+json')
    @Get('jwks.json')
    async getJwks(
        @Param('tenantId') tenantId: string,
    ): Promise<JwksResponseDto> {
        return this.wellKnownService.getJwks(tenantId);
    }
}
