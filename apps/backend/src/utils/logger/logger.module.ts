import { Module } from "@nestjs/common";
import { LoggerConfigService } from "./logger-config.service";
import { SessionLoggerInterceptor } from "./session-logger.interceptor";
import { SessionLoggerService } from "./session-logger.service";

@Module({
    providers: [
        LoggerConfigService,
        SessionLoggerService,
        SessionLoggerInterceptor,
    ],
    exports: [SessionLoggerService, SessionLoggerInterceptor],
})
export class LoggerModule {}
