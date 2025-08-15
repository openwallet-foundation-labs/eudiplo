import { Module } from "@nestjs/common";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";

@Module({
    imports: [
        //TODO: add a guard to protect the metrics endpoint
        PrometheusModule.register({
            defaultMetrics: {
                enabled: false,
            },
        }),
    ],
})
export class MetricModule {}
