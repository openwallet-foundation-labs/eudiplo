import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CryptoService } from "../crypto/crypto.service";
import { TokenRequestDto } from "./dto/token-request.dto";
import { TokenResponseDto } from "./dto/token-response.dto";

@Injectable()
export class OAuthService {
    // In a real implementation, you'd store these securely in a database
    private readonly clients = new Map<string, string>();

    constructor(
        private readonly configService: ConfigService,
        private readonly cryptoService: CryptoService,
    ) {
        // Initialize with some default clients - you can move this to configuration
        this.initializeClients();
    }

    private initializeClients() {
        // Add default client from environment variables if available
        const defaultClientId =
            this.configService.get<string>("OAUTH_CLIENT_ID");
        const defaultClientSecret = this.configService.get<string>(
            "OAUTH_CLIENT_SECRET",
        );

        if (defaultClientId && defaultClientSecret) {
            this.clients.set(defaultClientId, defaultClientSecret);
        }
    }

    async handleClientCredentialsGrant(
        request: TokenRequestDto,
    ): Promise<TokenResponseDto> {
        // Validate client credentials
        if (
            !this.validateClientCredentials(
                request.client_id,
                request.client_secret,
            )
        ) {
            throw new UnauthorizedException("Invalid client credentials");
        }

        // Generate access token
        const accessToken = await this.generateAccessToken(
            request.client_id,
            request.scope,
        );

        return {
            access_token: accessToken,
            token_type: "Bearer",
            expires_in: 3600, // 1 hour
            scope: request.scope || "openid",
        };
    }

    private validateClientCredentials(
        clientId: string,
        clientSecret: string,
    ): boolean {
        const storedSecret = this.clients.get(clientId);
        return storedSecret === clientSecret;
    }

    private async generateAccessToken(
        clientId: string,
        scope?: string,
    ): Promise<string> {
        const payload = {
            sub: clientId,
            aud: this.configService.getOrThrow<string>("PUBLIC_URL"),
            iss: this.configService.getOrThrow<string>("PUBLIC_URL"),
            scope: scope || "openid",
            exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
            iat: Math.floor(Date.now() / 1000),
        };

        // For now, we'll use the root tenant for signing
        // In a real implementation, you might want to use a dedicated OAuth signing key
        const tenantId = "root";
        return await this.cryptoService.signJwt(
            payload,
            { alg: "RS256" },
            tenantId,
        );
    }

    // Methods to manage clients dynamically
    addClient(clientId: string, clientSecret: string): void {
        this.clients.set(clientId, clientSecret);
    }

    removeClient(clientId: string): void {
        this.clients.delete(clientId);
    }

    hasClient(clientId: string): boolean {
        return this.clients.has(clientId);
    }
}
