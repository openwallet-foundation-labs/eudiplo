import { Injectable, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LoggerConfiguration {
    level: LogLevel;
    disableSessionLogger: boolean;
    disableHttpLogger: boolean;
    enableDebugMode: boolean;
    logFormat: 'json' | 'pretty';
}

/**
 * Service for managing logger configuration
 */
@Injectable()
export class LoggerConfigService {
    private config: LoggerConfiguration;

    constructor(private readonly configService: ConfigService) {
        this.loadConfiguration();
    }

    private loadConfiguration(): void {
        this.config = {
            level: this.parseLogLevel(
                this.configService.get<string>('LOG_LEVEL', 'info'),
            ),
            disableSessionLogger: this.configService.get<boolean>(
                'LOG_DISABLE_SESSION_LOGGER',
                false,
            ),
            disableHttpLogger: this.configService.get<boolean>(
                'LOG_DISABLE_HTTP_LOGGER',
                false,
            ),
            enableDebugMode: this.configService.get<boolean>(
                'LOG_DEBUG_MODE',
                false,
            ),
            logFormat: this.configService.get<'json' | 'pretty'>(
                'LOG_FORMAT',
                'pretty',
            ),
        };
    }

    private parseLogLevel(level: string): LogLevel {
        const levels: Record<string, LogLevel> = {
            verbose: 'verbose',
            debug: 'debug',
            log: 'log',
            warn: 'warn',
            error: 'error',
            fatal: 'fatal',
        };
        return levels[level.toLowerCase()] || 'log';
    }

    getConfiguration(): LoggerConfiguration {
        return { ...this.config };
    }

    isSessionLoggerEnabled(): boolean {
        return !this.config.disableSessionLogger;
    }

    isHttpLoggerEnabled(): boolean {
        return !this.config.disableHttpLogger;
    }

    isDebugModeEnabled(): boolean {
        return this.config.enableDebugMode;
    }

    getLogLevel(): LogLevel {
        return this.config.level;
    }

    getLogFormat(): 'json' | 'pretty' {
        return this.config.logFormat;
    }

    /**
     * Hot reload configuration from environment
     */
    reloadConfiguration(): void {
        this.loadConfiguration();
    }
}
