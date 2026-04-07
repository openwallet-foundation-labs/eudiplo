import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SessionLogEntry } from "../../../session/entities/session-log-entry.entity";
import { AuditLogService } from "./audit-log.service";
import { LoggerConfigService } from "./logger-config.service";
import { SessionLogStoreService } from "./session-log-store.service";

/**
 * Module for audit logging to the database.
 *
 * This module provides services for persisting audit events (flow_start, flow_complete,
 * flow_error, credential_issuance, credential_verification) to PostgreSQL for compliance
 * and audit trail purposes.
 *
 * For observability/debug logging, use `PinoLogger` directly — logs are exported to Loki
 * via the OpenTelemetry transport.
 */
@Module({
    imports: [TypeOrmModule.forFeature([SessionLogEntry])],
    providers: [LoggerConfigService, SessionLogStoreService, AuditLogService],
    exports: [AuditLogService, SessionLogStoreService, LoggerConfigService],
})
export class AuditLogModule {}
