import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { TokenPayload } from './token.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(private configService: ConfigService) {
        const oidc = configService.get<boolean>('OIDC');

        super(
            oidc
                ? JwtStrategy.getKeycloakConfig(configService)
                : JwtStrategy.getSimpleJwtConfig(configService),
        );
    }

    private static getKeycloakConfig(configService: ConfigService) {
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

    private static getSimpleJwtConfig(configService: ConfigService): any {
        const config = {
            secretOrKey: configService.get('JWT_SECRET'),
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            algorithms: ['HS256'], // Using symmetric key for simple JWT
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
        const oidc = this.configService.get<boolean>('OIDC') !== undefined;

        if (oidc) {
            // Multi-tenant: Extract user info from Keycloak token
            return payload;
        } else {
            // Single-tenant: Simple JWT validation
            return payload;
        }
    }
}
