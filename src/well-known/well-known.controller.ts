import { Controller, Get, Header, Param } from '@nestjs/common';
import { CryptoService } from '../crypto/crypto.service';
import { AuthorizeService } from '../issuer/authorize/authorize.service';
import { Oid4vciService } from '../issuer/oid4vci/oid4vci.service';
import { JwksResponseDto } from './dto/jwks-response.dto';
import { Oauth2AuthorizationServerResponse } from './dto/oauth-authorization-server-response.dto';
import { CredentialIssuerMetadataDto } from './dto/credential-issuer-metadata.dto';
import { ApiOperation } from '@nestjs/swagger';

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
    async issuerMetadata(@Param('tenantId') tenantId: string) {
        return (await this.oid4vciService.issuerMetadata(tenantId))
            .credentialIssuer as unknown as Promise<CredentialIssuerMetadataDto>;
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
