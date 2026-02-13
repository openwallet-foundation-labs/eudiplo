import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Request } from "express";

/**
 * Guard to protect the metrics endpoint with a Bearer token.
 *
 * If METRICS_TOKEN is not configured, the endpoint is unprotected (allows all).
 * When configured, requires `Authorization: Bearer <token>` header.
 *
 * @example
 * ```bash
 * # Set in .env
 * METRICS_TOKEN=your-secure-metrics-token
 *
 * # Prometheus scrape config
 * scrape_configs:
 *   - job_name: 'eudiplo'
 *     bearer_token: 'your-secure-metrics-token'
 *     static_configs:
 *       - targets: ['localhost:3000']
 * ```
 */
@Injectable()
export class MetricsAuthGuard implements CanActivate {
    private readonly metricsToken: string | undefined;

    constructor(configService: ConfigService) {
        this.metricsToken = configService.get<string>("METRICS_TOKEN");
    }

    canActivate(context: ExecutionContext): boolean {
        // If no token configured, allow access (backwards compatible)
        if (!this.metricsToken) {
            return true;
        }

        const request = context.switchToHttp().getRequest<Request>();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            throw new UnauthorizedException(
                "Missing Authorization header for metrics endpoint",
            );
        }

        const [scheme, token] = authHeader.split(" ");

        if (scheme?.toLowerCase() !== "bearer" || !token) {
            throw new UnauthorizedException(
                "Invalid Authorization header format. Expected: Bearer <token>",
            );
        }

        if (token !== this.metricsToken) {
            throw new UnauthorizedException("Invalid metrics token");
        }

        return true;
    }
}
