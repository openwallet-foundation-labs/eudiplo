import { Controller, Get } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import {
    HealthCheck,
    HealthCheckService,
    TypeOrmHealthIndicator,
} from "@nestjs/terminus";

/**
 * HealthController is responsible for providing health check endpoints.
 * It uses the HealthCheckService to perform checks on the database connection.
 */
@ApiTags("App")
@Controller("health")
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private db: TypeOrmHealthIndicator,
    ) {}

    /**
     * Endpoint to check the health of the service.
     * @returns
     */
    @Get()
    @HealthCheck()
    check() {
        return this.health.check([() => this.db.pingCheck("database")]);
    }
}
