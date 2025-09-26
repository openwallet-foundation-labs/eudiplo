import { Injectable, LogLevel } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

export interface LoggerConfiguration {
    level: LogLevel;
    enableSessionLogger: boolean;
    enableHttpLogger: boolean;
    enableDebugMode: boolean;
    logFormat: "json" | "pretty";
    logToFile: boolean;
    logFilePath: string;
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
                this.configService.get<string>("LOG_LEVEL", "info"),
            ),
            enableSessionLogger: this.configService.get<boolean>(
                "LOG_ENABLE_SESSION_LOGGER",
                false,
            ),
            enableHttpLogger: this.configService.get<boolean>(
                "LOG_ENABLE_HTTP_LOGGER",
                false,
            ),
            enableDebugMode: this.configService.get<boolean>(
                "LOG_DEBUG_MODE",
                false,
            ),
            logFormat: this.configService.get<"json" | "pretty">(
                "LOG_FORMAT",
                "pretty",
            ),
            logToFile: this.configService.get<boolean>("LOG_TO_FILE", false),
            logFilePath: this.configService.get<string>(
                "LOG_FILE_PATH",
                "./logs/session.log",
            ),
        };
    }

    private parseLogLevel(level: string): LogLevel {
        const levels: Record<string, LogLevel> = {
            verbose: "verbose",
            debug: "debug",
            log: "log",
            warn: "warn",
            error: "error",
            fatal: "fatal",
        };
        return levels[level.toLowerCase()] || "log";
    }

    getConfiguration(): LoggerConfiguration {
        return { ...this.config };
    }

    isSessionLoggerEnabled(): boolean {
        return this.config.enableSessionLogger;
    }

    isHttpLoggerEnabled(): boolean {
        return this.config.enableHttpLogger;
    }

    isDebugModeEnabled(): boolean {
        return this.config.enableDebugMode;
    }

    getLogLevel(): LogLevel {
        return this.config.level;
    }

    getLogFormat(): "json" | "pretty" {
        return this.config.logFormat;
    }

    /**
     * Check if logging to file is enabled
     */
    isFileLoggingEnabled(): boolean {
        return this.config.logToFile;
    }

    /**
     * Get the configured file path for logging
     */
    getLogFilePath(): string {
        return this.config.logFilePath;
    }

    /**
     * Hot reload configuration from environment
     */
    reloadConfiguration(): void {
        this.loadConfiguration();
    }

    /**
     * Check if automatic HTTP request/response logging should be enabled
     * This is used by the LoggerModule configuration
     */
    shouldEnableAutoLogging(): boolean {
        return this.isHttpLoggerEnabled();
    }
}
