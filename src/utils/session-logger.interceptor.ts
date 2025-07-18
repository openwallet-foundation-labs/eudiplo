import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';
import { SESSION_LOGGER_KEY } from './session-logger.decorator';

@Injectable()
export class SessionLoggerInterceptor implements NestInterceptor {
    constructor(
        private readonly reflector: Reflector,
        private readonly logger: PinoLogger,
    ) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const metadata = this.reflector.get(
            SESSION_LOGGER_KEY,
            context.getHandler(),
        );

        if (!metadata) {
            return next.handle();
        }

        const { sessionIdParam, flowType } = metadata;
        const request = context.switchToHttp().getRequest();
        const response = context.switchToHttp().getResponse();

        // Extract session ID from various sources
        const sessionId =
            request.params?.[sessionIdParam] ||
            request.body?.[sessionIdParam] ||
            request.headers['x-session-id'] ||
            request.query?.[sessionIdParam];

        const tenantId = request.params?.tenantId;
        const method = request.method;
        const url = request.url;

        // Set context for this logger instance
        this.logger.setContext('SessionLogger');

        // Create log context
        const logContext = {
            sessionId,
            tenantId,
            flowType,
            endpoint: `${method} ${url}`,
        };

        // Log the start of the request
        this.logger.info(
            {
                ...logContext,
                event: 'request_start',
                method,
                url,
                headers: {
                    'user-agent': request.headers['user-agent'],
                    'content-type': request.headers['content-type'],
                },
                body: this.sanitizeBody(request.body),
            },
            `[${flowType}] Starting ${method} ${url} for session ${sessionId}`,
        );

        const startTime = Date.now();

        return next.handle().pipe(
            tap((data) => {
                const duration = Date.now() - startTime;
                this.logger.info(
                    {
                        ...logContext,
                        event: 'request_success',
                        method,
                        url,
                        statusCode: response.statusCode,
                        duration,
                        responseSize: JSON.stringify(data || {}).length,
                    },
                    `[${flowType}] Completed ${method} ${url} for session ${sessionId} in ${duration}ms`,
                );
            }),
            catchError((error) => {
                const duration = Date.now() - startTime;
                this.logger.error(
                    {
                        ...logContext,
                        event: 'request_error',
                        method,
                        url,
                        error: {
                            name: error.name,
                            message: error.message,
                            stack: error.stack,
                        },
                        duration,
                    },
                    `[${flowType}] Error in ${method} ${url} for session ${sessionId}: ${error.message}`,
                );
                throw error;
            }),
        );
    }

    private sanitizeBody(body: any): any {
        if (!body) return body;

        // Create a copy to avoid modifying the original
        const sanitized = { ...body };

        // Remove sensitive fields
        const sensitiveFields = [
            'password',
            'token',
            'secret',
            'key',
            'private_key',
            'access_token',
            'refresh_token',
        ];

        sensitiveFields.forEach((field) => {
            if (sanitized[field]) {
                sanitized[field] = '[REDACTED]';
            }
        });

        return sanitized;
    }
}
