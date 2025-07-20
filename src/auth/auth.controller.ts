import {
    Controller,
    Post,
    Body,
    UnauthorizedException,
    Headers,
} from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtService } from './jwt.service';
import { ClientService } from './client.service';
import { Public } from './public.decorator';
import { ClientCredentialsDto } from './dto/client-credentials.dto';
import { TokenPayload } from './token.decorator';
import { TokenResponse } from './dto/token-response.dto';

@ApiTags('Authentication', 'Admin')
@Controller('auth')
export class AuthController {
    constructor(
        private jwtService: JwtService,
        private clientService: ClientService,
    ) {}

    /**
     * OAuth2 Token endpoint - supports client credentials flow only
     * Accepts client credentials either in Authorization header (Basic auth) or request body
     * @param body
     * @param headers
     * @returns
     */
    @Public()
    @Post('oauth2/token')
    @ApiBody({
        type: ClientCredentialsDto,
        examples: {
            client_credentials: {
                summary: 'Client Credentials Flow',
                value: {
                    grant_type: 'client_credentials',
                    client_id: 'root',
                    client_secret: 'root',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'OAuth2 token response',
        type: TokenResponse,
        example: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            token_type: 'Bearer',
            expires_in: 86400,
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid client credentials',
    })
    async getOAuth2Token(
        @Body() body: any,
        @Headers() headers: any,
    ): Promise<TokenResponse> {
        if (this.jwtService.isUsingExternalOIDC()) {
            throw new UnauthorizedException(
                'OAuth2 token endpoint is not available when using external OIDC provider. Use your external OIDC provider for authentication.',
            );
        }

        // Only support client credentials flow
        if (body.grant_type !== 'client_credentials') {
            throw new UnauthorizedException(
                'Only client_credentials grant type is supported',
            );
        }

        let clientId: string;
        let clientSecret: string;

        // Try to extract credentials from Authorization header (Basic auth)
        const authHeader = headers.authorization;
        if (authHeader && authHeader.startsWith('Basic ')) {
            try {
                const base64Credentials = authHeader.substring(6);
                const credentials = Buffer.from(
                    base64Credentials,
                    'base64',
                ).toString('ascii');
                const [id, secret] = credentials.split(':');
                clientId = id;
                clientSecret = secret;
            } catch {
                throw new UnauthorizedException(
                    'Invalid Authorization header format',
                );
            }
        } else {
            // Fall back to request body
            clientId = body.client_id;
            clientSecret = body.client_secret;
        }

        if (!clientId || !clientSecret) {
            throw new UnauthorizedException(
                'Client credentials must be provided either in Authorization header (Basic auth) or request body',
            );
        }

        const client = this.clientService.validateClient(
            clientId,
            clientSecret,
        );
        if (!client) {
            throw new UnauthorizedException('Invalid client credentials');
        }

        const payload: TokenPayload = {
            sub: client.id,
        };

        const token = await this.jwtService.generateToken(payload, {
            expiresIn: '24h',
            audience: 'eudiplo-service',
        });

        return {
            access_token: token,
            token_type: 'Bearer',
            expires_in: 86400, // 24 hours in seconds
        };
    }
}
