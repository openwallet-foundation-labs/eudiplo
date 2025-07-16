import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtService } from './jwt.service';
import { ClientService } from './client.service';
import { Public } from './public.decorator';
import { ClientCredentialsDto } from './dto/client-credentials.dto';
import { TokenPayload } from './token.decorator';

export class TokenResponse {
    access_token: string;
    token_type: 'Bearer';
    expires_in: string;
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private jwtService: JwtService,
        private clientService: ClientService,
    ) {}

    /**
     * Get JWT token using client credentials
     * @param body
     * @returns
     */
    @Public()
    @Post('token')
    @ApiBody({
        type: ClientCredentialsDto,
    })
    @ApiResponse({
        status: 200,
        description: 'JWT token generated successfully',
        type: TokenResponse,
        example: {
            access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            token_type: 'Bearer',
            expires_in: '24h',
        },
    })
    @ApiResponse({
        status: 401,
        description: 'Invalid client credentials or multi-tenant mode enabled',
    })
    async getToken(@Body() body: ClientCredentialsDto): Promise<TokenResponse> {
        if (this.jwtService.isMultiTenant()) {
            throw new UnauthorizedException(
                'Client credentials flow is not available in multi-tenant mode. Use your existing Keycloak/OIDC provider for authentication.',
            );
        }

        const client = this.clientService.validateClient(
            body.client_id,
            body.client_secret,
        );
        if (!client) {
            throw new UnauthorizedException('Invalid client credentials');
        }

        const payload: TokenPayload = {
            sub: client.id,
            client_id: client.id,
        };

        const token = await this.jwtService.generateToken(payload, {
            expiresIn: '24h', // Longer expiration for service accounts
            audience: 'eudiplo-service',
        });

        return {
            access_token: token,
            token_type: 'Bearer',
            expires_in: '24h',
        };
    }
}
