import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuditLogController } from "./audit-log.controller";
import { AuditLogService } from "./audit-log.service";
import { AuditLogEntity } from "./entities/audit-log.entity";

@Module({
    imports: [TypeOrmModule.forFeature([AuditLogEntity])],
    controllers: [AuditLogController],
    providers: [AuditLogService],
    exports: [AuditLogService],
})
export class AuditLogModule {}
