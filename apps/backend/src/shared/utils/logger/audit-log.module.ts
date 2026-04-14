import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SessionLogEntry } from "../../../session/entities/session-log-entry.entity";
import { AuditLogService } from "./audit-log.service";
import { SessionLogStoreService } from "./session-log-store.service";
import { SessionLoggerService } from "./session-logger.service";

/**
 * Module for audit logging.
 *
 * Provides two services:
 * - `AuditLogService`: persists audit events to the database only.
 * - `SessionLoggerService`: persists to the database AND logs via PinoLogger
 *   (exported to Loki via OpenTelemetry) for full observability.
 */
@Module({
    imports: [TypeOrmModule.forFeature([SessionLogEntry])],
    providers: [SessionLogStoreService, AuditLogService, SessionLoggerService],
    exports: [AuditLogService, SessionLoggerService, SessionLogStoreService],
})
export class AuditLogModule {}
