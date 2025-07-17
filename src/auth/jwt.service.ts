import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignJWT, jwtVerify, decodeJwt } from 'jose';
import { TokenPayload } from './token.decorator';

export interface GenerateTokenOptions {
    expiresIn?: string;
    audience?: string;
    subject?: string;
}

@Injectable()
export class JwtService {
    constructor(private configService: ConfigService) {}

    /**
     * Generate a JWT token for single-tenant mode
     */
    async generateToken(
        payload: TokenPayload,
        options: GenerateTokenOptions = {},
    ): Promise<string> {
        const isMultiTenant = this.configService.getOrThrow<boolean>('OIDC');

        if (isMultiTenant) {
            throw new Error(
                'Token generation is not available in multi-tenant mode. Use Keycloak for token generation.',
            );
        }

        const secret = this.configService.getOrThrow<string>('JWT_SECRET');
        const issuer = this.configService.getOrThrow<string>('JWT_ISSUER');
        const expiresIn =
            options.expiresIn ||
            this.configService.getOrThrow<string>('JWT_EXPIRES_IN');

        const secretKey = new TextEncoder().encode(secret);

        const jwt = new SignJWT({
            ...payload,
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer(issuer)
            .setSubject(options.subject || payload.sub)
            .setExpirationTime(expiresIn);

        if (options.audience) {
            jwt.setAudience(options.audience);
        }

        return await jwt.sign(secretKey);
    }

    /**
     * Verify a JWT token (for additional validation if needed)
     */
    async verifyToken(token: string): Promise<TokenPayload> {
        const isMultiTenant = this.configService.getOrThrow<boolean>('OIDC');

        if (isMultiTenant) {
            throw new Error(
                'Token verification is handled by Keycloak in multi-tenant mode.',
            );
        }

        const secret = this.configService.getOrThrow<string>('JWT_SECRET');
        const issuer = this.configService.getOrThrow<string>('JWT_ISSUER');

        const secretKey = new TextEncoder().encode(secret);

        try {
            const { payload } = await jwtVerify(token, secretKey, {
                issuer,
                algorithms: ['HS256'],
            });

            return payload as TokenPayload;
        } catch (error) {
            throw new Error(`Invalid token: ${error.message}`);
        }
    }

    /**
     * Decode token without verification (for debugging)
     */
    decodeToken(token: string): TokenPayload | null {
        try {
            return decodeJwt(token) as TokenPayload;
        } catch {
            return null;
        }
    }

    /**
     * Check if the service is in multi-tenant mode
     */
    isMultiTenant(): boolean {
        return this.configService.getOrThrow<boolean>('OIDC');
    }
}
