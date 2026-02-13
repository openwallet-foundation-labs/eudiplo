import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { PrometheusController } from "@willsoto/nestjs-prometheus";
import type { Response } from "express";
import { MetricsAuthGuard } from "./metrics-auth.guard";

/**
 * Custom metrics controller that extends the default PrometheusController
 * and adds Bearer token authentication via MetricsAuthGuard.
 *
 * Protection is optional - if METRICS_TOKEN env var is not set,
 * the endpoint is accessible without authentication.
 *
 * @example
 * ```bash
 * # Without protection (dev mode)
 * curl http://localhost:3000/metrics
 *
 * # With protection (when METRICS_TOKEN is set)
 * curl -H "Authorization: Bearer your-token" http://localhost:3000/metrics
 * ```
 */
@ApiExcludeController()
@Controller("metrics")
@UseGuards(MetricsAuthGuard)
export class MetricsController extends PrometheusController {
    @Get()
    async index(@Res({ passthrough: true }) response: Response) {
        return super.index(response);
    }
}
