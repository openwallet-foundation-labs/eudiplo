import { Controller, Get, Header, Req, UseGuards } from '@nestjs/common';
import { WellKnownService } from './well-known.service';
import { JwksResponseDto } from './dto/jwks-response.dto';
import { Oauth2AuthorizationServerResponse } from './dto/oauth-authorization-server-response.dto';
import {
    ApiExcludeController,
    ApiOperation,
    ApiProduces,
} from '@nestjs/swagger';
import { ContentType } from '../utils/mediaType/media-type.decorator';
import { MediaType } from '../utils/mediaType/media-type.enum';
import { SessionGuard } from '../session/session.guard';
import { SessionEntity } from '../session/session.decorator';
import { Session } from '../session/entities/session.entity';

/**
 * Controller for the OpenID4VCI well-known endpoints.
 */
@ApiExcludeController(process.env.SWAGGER_ALL === 'true')
@UseGuards(SessionGuard)
@Controller(':session/.well-known')
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
        @SessionEntity() session: Session,
        @ContentType() contentType: MediaType,
    ) {
        return this.wellKnownService.getIssuerMetadata(session, contentType);
    }

    /**
     * Authorization Server Metadata
     * @returns
     */
    @Get('oauth-authorization-server')
    authzMetadata(
        @SessionEntity() session: Session,
    ): Oauth2AuthorizationServerResponse {
        return this.wellKnownService.getAuthzMetadata(session);
    }

    /**
     * Returns the JSON Web Key Set (JWKS) for the authorization server.
     * @returns
     */
    @Header('Content-Type', 'application/jwk-set+json')
    @Get('jwks.json')
    async getJwks(@SessionEntity() session: Session): Promise<JwksResponseDto> {
        return this.wellKnownService.getJwks(session.tenantId);
    }
}
