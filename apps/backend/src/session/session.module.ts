import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { makeGaugeProvider } from "@willsoto/nestjs-prometheus";
import { StatusListModule } from "../issuer/lifecycle/status/status-list.module";
import { LoggerModule } from "../shared/utils/logger/logger.module";
import { Session } from "./entities/session.entity";
import { SessionController } from "./session.controller";
import { SessionService } from "./session.service";

/**
 * SessionModule is responsible for managing user sessions.
 */
@Module({
    imports: [
        TypeOrmModule.forFeature([Session]),
        StatusListModule,
        LoggerModule,
    ],
    providers: [
        SessionService,
        makeGaugeProvider({
            name: "sessions",
            help: "Total number of sessions by status",
            labelNames: ["tenant_id", "session_type", "status"],
        }),
    ],
    exports: [SessionService, LoggerModule],
    controllers: [SessionController],
})
export class SessionModule {}
