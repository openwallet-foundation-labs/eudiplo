import { Module } from "@nestjs/common";
import { AppController } from "./app/app.controller";
import { HealthModule } from "./health/health.module";
import { MetricsModule } from "./metrics/metrics.module";

/**
 * Core Module - Platform infrastructure and observability
 *
 * Responsibilities:
 * - Service information endpoint
 * - Health checks
 * - Metrics and monitoring
 */
@Module({
    imports: [HealthModule, MetricsModule],
    controllers: [AppController],
    exports: [HealthModule, MetricsModule],
})
export class CoreModule {}
