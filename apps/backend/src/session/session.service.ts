import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { InjectMetric } from "@willsoto/nestjs-prometheus/dist/injector";
import { Gauge } from "prom-client";
import { DeepPartial, FindOptionsWhere, LessThan, Repository } from "typeorm";
import { QueryDeepPartialEntity } from "typeorm/query-builder/QueryPartialEntity.js";
import { SessionCleanupMode } from "../auth/tenant/entitites/session-storage-config";
import { TenantEntity } from "../auth/tenant/entitites/tenant.entity";
import { Session, SessionStatus } from "./entities/session.entity";

@Injectable()
export class SessionService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SessionService.name);

    constructor(
        @InjectRepository(Session)
        private readonly sessionRepository: Repository<Session>,
        @InjectRepository(TenantEntity)
        private readonly tenantRepository: Repository<TenantEntity>,
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        @InjectMetric("sessions")
        private readonly sessionsCounter: Gauge<string>,
    ) {}

    /**
     * Register the tidy up cron job on application bootstrap.
     * This will run every hour by default, but can be configured via the `SESSION_TIDY_UP_INTERVAL` config variable.
     * @returns
     */
    async onApplicationBootstrap() {
        const callback = () => {
            void this.tidyUpSessions();
        };
        const intervalTime =
            this.configService.getOrThrow<number>("SESSION_TIDY_UP_INTERVAL") *
            1000;
        const interval = setInterval(callback, intervalTime);
        this.schedulerRegistry.addInterval("tidyUpSessions", interval);

        //set default values for session metrics
        const tenantId = "root";
        const states: SessionStatus[] = [
            SessionStatus.Active,
            SessionStatus.Fetched,
            SessionStatus.Completed,
            SessionStatus.Expired,
            SessionStatus.Failed,
        ];
        for (const state of states) {
            const issuanceCounter = await this.sessionRepository.countBy({
                tenantId,
                status: state,
            });
            this.sessionsCounter.set(
                {
                    tenant_id: tenantId,
                    session_type: "issuance",
                    status: state,
                },
                issuanceCounter,
            );
            const verificationCounter = await this.sessionRepository.countBy({
                tenantId,
                status: state,
            });
            this.sessionsCounter.set(
                {
                    tenant_id: tenantId,
                    session_type: "verification",
                    status: state,
                },
                verificationCounter,
            );
        }

        return this.tidyUpSessions();
    }

    /**
     * Create a new session.
     * @param session
     * @returns
     */
    async create(session: DeepPartial<Session>) {
        const createdSession = await this.sessionRepository.save(session);

        // Count total sessions created
        this.sessionsCounter.inc({
            tenant_id: createdSession.tenantId,
            session_type: createdSession.requestId
                ? "verification"
                : "issuance",
            status: "active",
        });

        return createdSession;
    }

    /**
     * Marks the session as successful or failed.
     * @param session
     * @param status
     */
    async setState(session: Session, status: SessionStatus) {
        const sessionType = session.requestId ? "verification" : "issuance";

        await this.sessionRepository.update({ id: session.id }, { status });

        // Count completed sessions (success or failure)
        this.sessionsCounter.inc({
            tenant_id: session.tenantId,
            session_type: sessionType,
            status,
        });

        // Decrease active sessions count
        this.sessionsCounter.dec({
            tenant_id: session.tenantId,
            session_type: sessionType,
            status: "active",
        });
    }

    /**
     * Update an existing session.
     * @param issuer_state
     * @param values
     * @returns
     */
    add(issuer_state: string, values: QueryDeepPartialEntity<Session>) {
        return this.sessionRepository.update({ id: issuer_state }, values);
    }

    /**
     * Get all sessions.
     * @returns
     */
    getAll(tenantId: string): Promise<Session[]> {
        return this.sessionRepository.find({
            where: { tenantId },
            order: { updatedAt: "DESC" },
        });
    }

    /**
     * Get a session by its state.
     * @param state
     * @returns
     */
    get(state: string) {
        return this.sessionRepository.findOneByOrFail({ id: state });
    }

    /**
     * Get a session by a specific condition.
     * @param where
     * @returns
     */
    getBy(where: FindOptionsWhere<Session>) {
        return this.sessionRepository.findOneByOrFail(where);
    }

    /**
     * Tidy up sessions based on per-tenant configuration.
     * Each tenant can configure their own TTL and cleanup mode.
     * - 'full' mode: Deletes the entire session record
     * - 'anonymize' mode: Keeps session metadata but removes personal data
     */
    async tidyUpSessions() {
        const defaultTtlSeconds =
            this.configService.getOrThrow<number>("SESSION_TTL");
        const defaultCleanupMode = this.configService.getOrThrow<string>(
            "SESSION_CLEANUP_MODE",
        );

        // Get all tenants to check for custom session configs
        const tenants = await this.tenantRepository.find();

        // Process each tenant with their specific config
        for (const tenant of tenants) {
            const ttlSeconds =
                tenant.sessionConfig?.ttlSeconds ?? defaultTtlSeconds;
            const cutoffDate = new Date(Date.now() - ttlSeconds * 1000);
            const cleanupMode =
                tenant.sessionConfig?.cleanupMode ?? defaultCleanupMode;

            if (cleanupMode === SessionCleanupMode.Anonymize) {
                // Anonymize: Keep session metadata (including original status) but remove personal data
                // We use a raw query to only target sessions that still have personal data
                const result = await this.sessionRepository
                    .createQueryBuilder()
                    .update()
                    .set({
                        // Clear personal data fields
                        credentials: undefined,
                        credentialPayload: undefined,
                        auth_queries: undefined,
                        offer: undefined,
                        requestObject: undefined,
                    })
                    .where("tenantId = :tenantId", { tenantId: tenant.id })
                    .andWhere("createdAt < :cutoffDate", { cutoffDate })
                    // Only anonymize sessions that still have personal data
                    .andWhere(
                        "(credentials IS NOT NULL OR credentialPayload IS NOT NULL OR auth_queries IS NOT NULL OR offer IS NOT NULL OR requestObject IS NOT NULL)",
                    )
                    .execute();
                if (result.affected && result.affected > 0) {
                    this.logger.log(
                        `Anonymized ${result.affected} sessions for tenant ${tenant.id}`,
                    );
                }
            } else {
                // Full delete (default behavior)
                const result = await this.sessionRepository.delete({
                    tenantId: tenant.id,
                    createdAt: LessThan(cutoffDate),
                });
                if (result.affected && result.affected > 0) {
                    this.logger.log(
                        `Deleted ${result.affected} sessions for tenant ${tenant.id}`,
                    );
                }
            }
        }

        // Also clean up sessions for tenants that no longer exist (orphaned sessions)
        const tenantIds = tenants.map((t) => t.id);
        if (tenantIds.length > 0) {
            const orphanedResult = await this.sessionRepository
                .createQueryBuilder()
                .delete()
                .where("tenantId NOT IN (:...tenantIds)", { tenantIds })
                .andWhere("createdAt < :cutoff", {
                    cutoff: new Date(Date.now() - defaultTtlSeconds * 1000),
                })
                .execute();
            if (orphanedResult.affected && orphanedResult.affected > 0) {
                this.logger.log(
                    `Deleted ${orphanedResult.affected} orphaned sessions`,
                );
            }
        }
    }

    /**
     * Deletes a session by its ID and tenant ID.
     * @param id
     * @param sub
     * @returns
     */
    delete(id: string, sub: string): Promise<any> {
        return this.sessionRepository.delete({ id, tenantId: sub });
    }
}
