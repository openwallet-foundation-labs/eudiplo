import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { InjectMetric } from '@willsoto/nestjs-prometheus/dist/injector';
import { Gauge } from 'prom-client';
import {
    DeepPartial,
    FindOptionsWhere,
    IsNull,
    LessThan,
    Not,
    Repository,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Session, SessionStatus } from './entities/session.entity';

@Injectable()
export class SessionService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(Session)
        private sessionRepository: Repository<Session>,
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
        @InjectMetric('sessions')
        private sessionsCounter: Gauge<string>,
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
            this.configService.getOrThrow<number>('SESSION_TIDY_UP_INTERVAL') *
            1000;
        const interval = setInterval(callback, intervalTime);
        this.schedulerRegistry.addInterval('tidyUpSessions', interval);

        //set default values for session metrics
        const tenantId = 'root';
        const states: SessionStatus[] = [
            'active',
            'completed',
            'expired',
            'failed',
        ];
        for (const state of states) {
            const issuanceCounter = await this.sessionRepository.countBy({
                tenantId,
                issuanceId: Not(IsNull()),
                status: state,
            });
            this.sessionsCounter.set(
                {
                    tenant_id: tenantId,
                    session_type: 'issuance',
                    status: state,
                },
                issuanceCounter,
            );
            const verificationCounter = await this.sessionRepository.countBy({
                tenantId,
                issuanceId: IsNull(),
                status: state,
            });
            this.sessionsCounter.set(
                {
                    tenant_id: tenantId,
                    session_type: 'verification',
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
            session_type: createdSession.issuanceId
                ? 'issuance'
                : 'verification',
            status: 'active',
        });

        return createdSession;
    }

    /**
     * Marks the session as successful or failed.
     * @param session
     * @param status
     */
    async setState(session: Session, status: SessionStatus) {
        const sessionType = session.issuanceId ? 'issuance' : 'verification';

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
            status: 'active',
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
    getAll(): Promise<Session[]> {
        return this.sessionRepository.find({
            order: { updatedAt: 'DESC' },
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
     * Tidy up sessions that are older than 1 day.
     */
    tidyUpSessions() {
        const ttl = this.configService.getOrThrow<number>('SESSION_TTL') * 1000;
        return this.sessionRepository.delete({
            createdAt: LessThan(new Date(Date.now() - ttl)),
        });
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
