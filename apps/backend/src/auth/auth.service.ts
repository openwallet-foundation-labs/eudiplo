import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InternalClientsProvider } from "./client/adapters/internal-clients.service";
import { CLIENTS_PROVIDER } from "./client/client.provider";
import { OidcDiscoveryDto } from "./dto/oidc-discovery.dto";
import { TokenResponse } from "./dto/token-response.dto";
import { JwtService } from "./jwt.service";
import { Role } from "./roles/role.enum";
import { InternalTokenPayload } from "./token.decorator";

/**
 * Authentication Service
 */
@Injectable()
export class AuthService {
    /**
     * Constructor for AuthService
     * @param jwtService
     * @param tenantService
     * @param configService
     */
    constructor(
        private jwtService: JwtService,
        @Inject(CLIENTS_PROVIDER) private clients: InternalClientsProvider,
        private configService: ConfigService,
    ) {}

    /**
     * Get OAuth2 token
     * @param body
     * @param headers
     * @returns
     */
    async getOAuth2Token(body: any, headers: any): Promise<TokenResponse> {
        if (this.jwtService.isUsingExternalOIDC()) {
            throw new UnauthorizedException(
                "OAuth2 token endpoint is not available when using external OIDC provider. Use your external OIDC provider for authentication.",
            );
        }

        // Only support client credentials flow
        if (body.grant_type !== "client_credentials") {
            throw new UnauthorizedException(
                "Only client_credentials grant type is supported",
            );
        }

        let clientId: string;
        let clientSecret: string;

        // Try to extract credentials from Authorization header (Basic auth)
        const authHeader = headers.authorization;
        if (authHeader && authHeader.startsWith("Basic ")) {
            try {
                const base64Credentials = authHeader.substring(6);
                const credentials = Buffer.from(
                    base64Credentials,
                    "base64",
                ).toString("ascii");
                const [id, secret] = credentials.split(":");
                clientId = id;
                clientSecret = secret;
            } catch {
                throw new UnauthorizedException(
                    "Invalid Authorization header format",
                );
            }
        } else {
            // Fall back to request body
            clientId = body.client_id;
            clientSecret = body.client_secret;
        }

        if (!clientId || !clientSecret) {
            throw new UnauthorizedException(
                "Client credentials must be provided either in Authorization header (Basic auth) or request body",
            );
        }

        const client = await this.clients.validateClientCredentials(
            clientId,
            clientSecret,
        );

        if (!client) {
            throw new UnauthorizedException("Invalid client credentials");
        }

        //TODO: check if the access token should only include the session id or also e.g. the credentials that should be issued. I would think this is not required since we still need the claims for it.
        const payload: InternalTokenPayload = {
            roles: [
                Role.IssuanceOffer,
                Role.PresentationOffer,
                Role.Issuances,
                Role.Presentations,
                Role.Clients,
                Role.Tenants,
            ],
            tenant_id: client.tenantId!,
        };

        //TODO: make expiresIn configurable?
        const access_token = await this.jwtService.generateToken(payload, {
            expiresIn: "24h",
            audience: "eudiplo-service",
            //TODO: check if the clientId should be saved here or somewhere else like in client_id
            subject: clientId,
        });

        const refresh_token = await this.jwtService.generateToken(payload, {
            expiresIn: "30d",
            audience: "eudiplo-service",
            subject: clientId,
        });

        return {
            access_token,
            refresh_token,
            token_type: "Bearer",
            expires_in: 86400, // 24 hours in seconds
        };
    }

    /**
     * Get OIDC Discovery configuration
     * @returns OIDC Discovery configuration
     */
    getOidcDiscovery(): OidcDiscoveryDto {
        const publicUrl = this.configService.getOrThrow<string>("PUBLIC_URL");
        const oidc = this.configService.get<string>("OIDC");

        return {
            issuer: oidc ?? publicUrl,
            token_endpoint: `${publicUrl}/oauth2/token`,
            jwks_uri: `${publicUrl}/.well-known/jwks.json`,
            response_types_supported: ["token"],
            grant_types_supported: ["client_credentials"],
            token_endpoint_auth_methods_supported: [
                "client_secret_basic",
                "client_secret_post",
            ],
            subject_types_supported: ["public"],
            id_token_signing_alg_values_supported: ["ES256"],
            scopes_supported: ["openid"],
            claims_supported: ["iss", "sub", "aud", "exp", "iat"],
            service_documentation:
                "https://openwallet-foundation-labs.github.io/eudiplo/latest/",
        };
    }
}
