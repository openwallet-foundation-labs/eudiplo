import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SessionLogEntry } from "../../../session/entities/session-log-entry.entity";
import { LoggerConfigService } from "./logger-config.service";
import { SessionLogStoreService } from "./session-log-store.service";
import { SessionLoggerService } from "./session-logger.service";

@Module({
    imports: [TypeOrmModule.forFeature([SessionLogEntry])],
    providers: [
        LoggerConfigService,
        SessionLogStoreService,
        SessionLoggerService,
    ],
    exports: [
        SessionLoggerService,
        SessionLogStoreService,
        LoggerConfigService,
    ],
})
export class LoggerModule {}
