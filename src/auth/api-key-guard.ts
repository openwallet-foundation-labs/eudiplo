// src/auth/api-key.guard.ts
import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const apiKey = request.headers['x-api-key'];

        const validKey = this.configService.getOrThrow<string>('AUTH_API_KEY');

        if (apiKey !== validKey) {
            throw new UnauthorizedException('Invalid API key');
        }

        return true;
    }
}
