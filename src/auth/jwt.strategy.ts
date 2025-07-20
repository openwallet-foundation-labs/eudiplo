import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from './token.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private configService: ConfigService) {
        const useExternalOIDC = configService.get<boolean>('OIDC');

        super(
            useExternalOIDC
                ? JwtStrategy.getExternalOIDCConfig(configService)
                : JwtStrategy.getIntegratedOAuth2Config(configService),
        );
    }

    private static getExternalOIDCConfig(configService: ConfigService) {
        //TODO: test it
        return {
            secretOrKeyProvider: passportJwtSecret({
                cache: true,
                rateLimit: true,
                jwksRequestsPerMinute: 5,
                jwksUri: `${configService.get('KEYCLOAK_INTERNAL_ISSUER_URL')}/protocol/openid-connect/certs`,
                handleSigningKeyError: (err, cb) => {
                    console.log('Keycloak JWKS error:', err);
                    if (err instanceof Error) {
                        return cb(err);
                    }
                    return cb(
                        new Error(
                            'Could not get the signing key from Keycloak',
                        ),
                    );
                },
            }),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            algorithms: ['RS256'],
            issuer: configService.get('KEYCLOAK_INTERNAL_ISSUER_URL'),
            audience: configService.get('KEYCLOAK_CLIENT_ID'), // You may want to add this to validation schema
        };
    }

    private static getIntegratedOAuth2Config(
        configService: ConfigService,
    ): any {
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

    validate(payload: TokenPayload): unknown {
        const useExternalOIDC =
            this.configService.get<boolean>('OIDC') !== undefined;

        if (useExternalOIDC) {
            // External OIDC: Extract user info from external provider token
            return payload;
        } else {
            // Integrated OAuth2: Use integrated server token validation
            return payload;
        }
    }
}
