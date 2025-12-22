import { RequestMethod } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

/**
 * Factory function for configuring the logger module
 * @param configService The config service instance
 * @returns The logger configuration object
 */
export const createLoggerOptions = (configService: ConfigService) => {
    const enableHttpLogger = configService.get<boolean>(
        "LOG_ENABLE_HTTP_LOGGER",
        false,
    );

    // Check if file logging is enabled
    const logToFile = configService.get<boolean>("LOG_TO_FILE");
    const logFilePath = configService.get<string>("LOG_FILE_PATH");

    let transportConfig;

    if (logToFile) {
        // Configure both console and file logging
        transportConfig = {
            targets: [
                // Console pretty logging
                {
                    target: "pino-pretty",
                    level: configService.get("LOG_LEVEL", "info"),
                    options: {
                        colorize: true,
                        singleLine: false,
                        translateTime: "yyyy-mm-dd HH:MM:ss",
                        ignore: "pid,hostname",
                    },
                },
                // File logging - ensure order is maintained with sync: true
                {
                    target: "pino/file",
                    level: configService.get("LOG_LEVEL", "info"),
                    options: {
                        destination: logFilePath,
                        mkdir: true,
                        sync: true, // Use synchronous writes to ensure message order
                    },
                },
            ],
        };
    } else {
        // Console logging only
        transportConfig = {
            target: "pino-pretty",
            options: {
                colorize: true,
                singleLine: false,
                translateTime: "yyyy-mm-dd HH:MM:ss",
                ignore: "pid,hostname",
            },
        };
    }

    return {
        pinoHttp: {
            level: configService.get("LOG_LEVEL", "info"),
            autoLogging: enableHttpLogger,
            transport: transportConfig,
            formatters: {
                log: (object) => {
                    object.hostname = undefined;
                    return object;
                },
            },
            customProps: (req: any) => ({
                sessionId: req.params?.session,
            }),
            serializers: {
                req: (req: any) => ({
                    method: req.method,
                    url: req.url,
                    headers: {
                        "user-agent": req.headers["user-agent"],
                        "content-type": req.headers["content-type"],
                    },
                    sessionId: req.params?.session,
                    tenantId: req.params?.tenantId,
                }),
                res: (res: any) => ({
                    statusCode: res.statusCode,
                }),
            },
        },
        exclude: [{ path: "/session/:sessionId", method: RequestMethod.ALL }],
    };
};
