import { Module } from "@nestjs/common";
import { LoggerConfigService } from "./logger-config.service";
import { SessionLoggerService } from "./session-logger.service";

@Module({
    providers: [LoggerConfigService, SessionLoggerService],
    exports: [SessionLoggerService],
})
export class LoggerModule {}
