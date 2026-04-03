import { Module } from "@nestjs/common";
import { OpenTelemetryModule } from "nestjs-otel";
import { AppController } from "./app/app.controller";
import { HealthModule } from "./health/health.module";

/**
 * Core Module - Platform infrastructure and observability
 *
 * Responsibilities:
 * - Service information endpoint
 * - Health checks
 * - OpenTelemetry metrics and tracing
 */
@Module({
    imports: [
        HealthModule,
        OpenTelemetryModule.forRoot({
            metrics: {
                hostMetrics: true,
            },
        }),
    ],
    controllers: [AppController],
    exports: [HealthModule],
})
export class CoreModule {}
