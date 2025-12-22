import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { catchError, tap } from "rxjs/operators";
import { SESSION_LOGGER_KEY } from "./session-logger.decorator";
import { SessionLoggerService } from "./session-logger.service";
import { SessionLogContext } from "./session-logger-context";

/**
 * Interceptor for logging session-related requests and responses.
 */
@Injectable()
export class SessionLoggerInterceptor implements NestInterceptor {
    /**
     * Constructor for SessionLoggerInterceptor.
     * @param reflector - Reflector instance for accessing metadata.
     * @param sessionLoggerService - Session Logger service for consistent logging behavior.
     */
    constructor(
        private readonly reflector: Reflector,
        private readonly sessionLoggerService: SessionLoggerService,
    ) {}

    /**
     * Intercepts the request and logs session-related information.
     * @param context - Execution context of the request.
     * @param next - Call handler to proceed with the request.
     * @returns An observable that emits the response data.
     */
    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const metadata = this.reflector.get(
            SESSION_LOGGER_KEY,
            context.getHandler(),
        );

        // Skip if no metadata or logger is disabled (the service will check enablement)
        if (!metadata) {
            return next.handle();
        }

        const { sessionIdParam, flowType } = metadata;
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        const sessionId = request.params[sessionIdParam];
        const tenantId = request.params?.tenantId;
        const method = request.method;
        const url = request.url;

        // Create log context for consistent logging
        const logContext: SessionLogContext = {
            sessionId,
            tenantId,
            flowType,
            endpoint: `${method} ${url}`,
        };

        // Log the start of the request using SessionLoggerService
        this.sessionLoggerService.logSession(
            logContext,
            `Starting ${method} ${url}`,
            {
                event: "request_start",
                method,
                url,
                headers: {
                    "user-agent": request.headers["user-agent"],
                    "content-type": request.headers["content-type"],
                },
                body: this.sanitizeBody(request.body),
            },
        );

        const startTime = Date.now();

        return next.handle().pipe(
            tap((data) => {
                const duration = Date.now() - startTime;
                // Log successful request completion
                this.sessionLoggerService.logSession(
                    logContext,
                    `Completed ${method} ${url} in ${duration}ms`,
                    {
                        event: "request_success",
                        method,
                        url,
                        statusCode: response.statusCode,
                        duration,
                        responseSize: JSON.stringify(data || {}).length,
                    },
                );
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;
                // Log request error
                this.sessionLoggerService.logSessionError(
                    logContext,
                    error,
                    `Error in ${method} ${url}`,
                    {
                        event: "request_error",
                        method,
                        url,
                        duration,
                    },
                );
                throw error;
            }),
        );
    }

    /**
     * Sanitizes the request body to remove sensitive information.
     * @param body - The request body to sanitize.
     * @returns Sanitized body.
     */
    private sanitizeBody(body: any): any {
        if (!body) return body;

        // Create a copy to avoid modifying the original
        const sanitized = { ...body };

        // Remove sensitive fields
        const sensitiveFields = [
            "password",
            "token",
            "secret",
            "key",
            "private_key",
            "access_token",
            "refresh_token",
        ];

        sensitiveFields.forEach((field) => {
            if (sanitized[field]) {
                sanitized[field] = "[REDACTED]";
            }
        });

        return sanitized;
    }
}
