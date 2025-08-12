import { Controller, Get, Header, UseGuards } from '@nestjs/common';
import {
  ApiExcludeController,
  ApiOperation,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import { Session } from '../session/entities/session.entity';
import { SessionEntity } from '../session/session.decorator';
import { SessionGuard } from '../session/session.guard';
import { ContentType } from '../utils/mediaType/media-type.decorator';
import { MediaType } from '../utils/mediaType/media-type.enum';
import { JwksResponseDto } from './dto/jwks-response.dto';
import { Oauth2AuthorizationServerResponse } from './dto/oauth-authorization-server-response.dto';
import { WellKnownService } from './well-known.service';

/**
 * Controller for the OpenID4VCI well-known endpoints.
 */
@ApiExcludeController(process.env.SWAGGER_ALL !== 'true')
@UseGuards(SessionGuard)
@ApiParam({
  name: 'session',
  required: true,
})
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
  issuerMetadata(
    @SessionEntity() session: Session,
    @ContentType() contentType: MediaType
  ) {
    return this.wellKnownService.getIssuerMetadata(session, contentType);
  }

  /**
   * Authorization Server Metadata
   * @returns
   */
  @Get('oauth-authorization-server')
  authzMetadata(
    @SessionEntity() session: Session
  ): Oauth2AuthorizationServerResponse {
    return this.wellKnownService.getAuthzMetadata(session);
  }

  /**
   * Returns the JSON Web Key Set (JWKS) for the authorization server.
   * @returns
   */
  @Header('Content-Type', 'application/jwk-set+json')
  @Get('jwks.json')
  getJwks(@SessionEntity() session: Session): Promise<JwksResponseDto> {
    return this.wellKnownService.getJwks(session.tenantId);
  }
}
