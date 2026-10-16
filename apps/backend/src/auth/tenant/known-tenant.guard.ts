import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    NotFoundException,
} from "@nestjs/common";
import { TenantNotFound } from "./domain/tenant-data.js";
import {
    TENANT_REPOSITORY,
    type TenantRepository,
} from "./ports/tenant.repository.js";

/**
 * Answers 404 for every route whose `:tenantId` path parameter names no
 * tenant, before the handler runs. Without it, the public issuer routes fail
 * further down (missing keys, foreign key constraints) with a 500. A tenant
 * whose setup has not finished still passes; only its existence is checked.
 */
@Injectable()
export class KnownTenantGuard implements CanActivate {
    constructor(
        @Inject(TENANT_REPOSITORY)
        private readonly tenantRepository: TenantRepository,
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        if (context.getType() !== "http") {
            return true;
        }
        const tenantId: unknown = context.switchToHttp().getRequest()
            .params?.tenantId;
        if (typeof tenantId !== "string") {
            return true;
        }
        if (!(await this.tenantRepository.findById(tenantId))) {
            // An HttpException keeps the message in production as well.
            throw new NotFoundException(new TenantNotFound(tenantId).message);
        }
        return true;
    }
}
