import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { TokenRequestDto } from './dto/token-request.dto';
import { TokenResponseDto } from './dto/token-response.dto';
import { OAuthService } from './oauth.service';

@ApiTags('OAuth 2.0')
@Controller('oauth')
export class OAuthController {
    constructor(private readonly oauthService: OAuthService) {}

    /**
     * OAuth 2.0 token endpoint for client credentials flow.
     * This endpoint allows clients to obtain access tokens using their client credentials.
     */
    @ApiOperation({
        summary: 'OAuth 2.0 Token Endpoint',
        description:
            'Obtain an access token using client credentials grant type.',
    })
    @Post('token')
    async getToken(
        @Body() tokenRequest: TokenRequestDto,
    ): Promise<TokenResponseDto> {
        return await this.oauthService.handleClientCredentialsGrant(
            tokenRequest,
        );
    }
}
