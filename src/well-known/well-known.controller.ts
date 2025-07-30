import { Controller, Get, Header, Param } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import { AuthorizeService } from '../issuer/authorize/authorize.service';
import { Oid4vciService } from '../issuer/oid4vci/oid4vci.service';
import { JwksResponseDto } from './dto/jwks-response.dto';
import { Oauth2AuthorizationServerResponse } from './dto/oauth-authorization-server-response.dto';
import { CredentialIssuerMetadataDto } from './dto/credential-issuer-metadata.dto';
import { ApiOperation } from '@nestjs/swagger';
import { ContentType } from '../utils/mediaType/media-type.decorator';
import { MediaType } from '../utils/mediaType/media-type.enum';

/**
 * Controller for the OpenID4VCI well-known endpoints.
 */
@Controller(':tenantId/.well-known')
export class WellKnownController {
    constructor(
        private readonly oid4vciService: Oid4vciService,
        private readonly authorizeService: AuthorizeService,
        private readonly cryptoService: CryptoService,
    ) {}

    @ApiOperation({
        summary: 'Get OpenID4VCI issuer metadata',
        description: 'Returns the OpenID4VCI issuer metadata.',
    })
    @Get('openid-credential-issuer')
    async issuerMetadata(
        @Param('tenantId') tenantId: string,
        @ContentType() contentType: MediaType,
    ) {
        /**
           - an unsigned JSON document using the media type application/json, or
           - a signed JSON Web Token (JWT) containing the Credential Issuer Metadata in its payload using the media type application/jwt.
         */
        const metadata = (await this.oid4vciService.issuerMetadata(tenantId))
            .credentialIssuer as unknown as CredentialIssuerMetadataDto;
        if (contentType === MediaType.APPLICATION_JWT) {
            return this.cryptoService.signJwt(
                {
                    // [Review]: Could I get `alg` value here? or kid??
                    typ: 'openidvci-issuer-metadata+jwt',
                },
                {
                    ...metadata,
                    // [Review]: could `iss` value same with `sub` or not?
                    iss: metadata.credential_issuer,
                    sub: metadata.credential_issuer,
                    iat: Math.floor(new Date().getTime() / 1000),
                    // [Review]: should we add `exp` value here?
                },
                tenantId,
            );
        }
        return metadata;
    }

    /**
     * Authorization Server Metadata
     * @returns
     */
    @Get('oauth-authorization-server')
    authzMetadata(
        @Param('tenantId') tenantId: string,
    ): Oauth2AuthorizationServerResponse {
        return this.authorizeService.authzMetadata(
            tenantId,
        ) as Oauth2AuthorizationServerResponse;
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
        return this.cryptoService.getJwks(tenantId).then((key) => ({
            keys: [key],
        }));
    }
}
