import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PinoLogger } from 'nestjs-pino';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { SESSION_LOGGER_KEY } from './session-logger.decorator';

/**
 * Interceptor for logging session-related requests and responses.
 */
@Injectable()
export class SessionLoggerInterceptor implements NestInterceptor {
  private readonly isEnabled: boolean;

  /**
   * Constructor for SessionLoggerInterceptor.
   * @param reflector - Reflector instance for accessing metadata.
   * @param logger - PinoLogger instance for logging.
   * @param configService - ConfigService for accessing configuration.
   */
  constructor(
    private readonly reflector: Reflector,
    private readonly logger: PinoLogger,
    private readonly configService: ConfigService
  ) {
    this.isEnabled = this.configService.get<boolean>(
      'LOG_ENABLE_SESSION_LOGGER',
      false
    );
  }

  /**
   * Intercepts the request and logs session-related information.
   * @param context - Execution context of the request.
   * @param next - Call handler to proceed with the request.
   * @returns An observable that emits the response data.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const metadata = this.reflector.get(
      SESSION_LOGGER_KEY,
      context.getHandler()
    );

    if (!metadata || !this.isEnabled) {
      return next.handle();
    }

    const { sessionIdParam, flowType } = metadata;
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const sessionId = request.params[sessionIdParam];

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
      `[${flowType}] Starting ${method} ${url} for session ${sessionId}`
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
          `[${flowType}] Completed ${method} ${url} for session ${sessionId} in ${duration}ms`
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
          `[${flowType}] Error in ${method} ${url} for session ${sessionId}: ${error.message}`
        );
        throw error;
      })
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
