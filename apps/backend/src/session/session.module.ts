import { forwardRef, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { TenantEntity } from "../auth/tenant/entitites/tenant.entity";
import { StatusListModule } from "../issuer/lifecycle/status/status-list.module";
import { LoggerModule } from "../shared/utils/logger/logger.module";
import { Session } from "./entities/session.entity";
import { SessionLogEntry } from "./entities/session-log-entry.entity";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";
import { SessionConfigController } from "./session-config.controller";
import { SessionConfigService } from "./session-config.service";
import { SessionEventsController } from "./session-events.controller";
import { SessionEventsService } from "./session-events.service";

/**
 * SessionModule is responsible for managing user sessions.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Session, TenantEntity, SessionLogEntry]),
        StatusListModule,
        LoggerModule,
        forwardRef(() => AuthModule),
    ],
    providers: [SessionService, SessionConfigService, SessionEventsService],
    exports: [
        SessionService,
        SessionConfigService,
        SessionEventsService,
        LoggerModule,
    ],
    controllers: [
        SessionController,
        SessionConfigController,
        SessionEventsController,
    ],
})
export class SessionModule {}
