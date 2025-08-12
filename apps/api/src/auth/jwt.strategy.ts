import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ClientService } from './client.service';
import { TokenPayload } from './token.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private clientService: ClientService
  ) {
    const useExternalOIDC = configService.get<boolean>('OIDC');

    const config = useExternalOIDC
      ? JwtStrategy.getExternalOIDCConfig(configService)
      : JwtStrategy.getIntegratedOAuth2Config(configService);

    super(config);
  }

  // Override authenticate to add debugging
  authenticate(req: any, options?: any) {
    return super.authenticate(req, {
      ...options,
      failWithError: true, // This will throw errors instead of just returning 401
    });
  }

  private static getExternalOIDCConfig(configService: ConfigService) {
    const keycloakIssuerUrl = configService.get('KEYCLOAK_INTERNAL_ISSUER_URL');
    const jwksUri = `${keycloakIssuerUrl}/protocol/openid-connect/certs`;

    return {
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: jwksUri,
        handleSigningKeyError: (err, cb) => {
          console.error('❌ Keycloak JWKS error:', err);
          if (err instanceof Error) {
            return cb(err);
          }
          return cb(new Error('Could not get the signing key from Keycloak'));
        },
      }),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: [configService.get('KEYCLOAK_ALGORITHM')],
      issuer: keycloakIssuerUrl,
    };
  }

  private static getIntegratedOAuth2Config(configService: ConfigService): any {
    const config = {
      secretOrKey: configService.get('JWT_SECRET'),
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      algorithms: ['HS256'], // Using symmetric key for integrated OAuth2
      ignoreExpiration: false, // Ensure tokens expire
    };

    // Add issuer validation only if JWT_ISSUER is configured
    const issuer = configService.get('JWT_ISSUER');
    if (issuer) {
      (config as any).issuer = issuer;
    }

    return config;
  }

  /**
   * Validate the JWT payload. It will also check if the client is set up.
   * @param payload The JWT payload
   * @returns The validated payload or an error
   */
  async validate(payload: TokenPayload): Promise<unknown> {
    const useExternalOIDC =
      this.configService.get<boolean>('OIDC') !== undefined;

    await this.clientService.isSetUp(payload.sub);

    if (useExternalOIDC) {
      // External OIDC: Extract user info from external provider token
      return payload;
    } else {
      // Integrated OAuth2: Use integrated server token validation
      return payload;
    }
  }
}
