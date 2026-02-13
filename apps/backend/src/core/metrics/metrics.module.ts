import { Module } from "@nestjs/common";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { MetricsController } from "./metrics.controller";
import { MetricsAuthGuard } from "./metrics-auth.guard";

@Module({
    imports: [
        PrometheusModule.register({
            defaultMetrics: {
                enabled: false,
            },
            controller: MetricsController,
        }),
    ],
    providers: [MetricsAuthGuard],
})
export class MetricsModule {}
