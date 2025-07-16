import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Session } from './entities/session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, LessThan, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SessionService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(Session)
        private sessionRepository: Repository<Session>,
        private readonly configService: ConfigService,
        private readonly schedulerRegistry: SchedulerRegistry,
    ) {}

    /**
     * Register the tidy up cron job on application bootstrap.
     * This will run every hour by default, but can be configured via the `SESSION_TIDY_UP_INTERVAL` config variable.
     * @returns
     */
    onApplicationBootstrap() {
        const callback = () => {
            void this.tidyUpSessions();
        };
        const intervalTime =
            this.configService.getOrThrow<number>('SESSION_TIDY_UP_INTERVAL') *
            1000;
        const interval = setInterval(callback, intervalTime);
        this.schedulerRegistry.addInterval('tidyUpSessions', interval);
        return this.tidyUpSessions();
    }

    /**
     * Create a new session.
     * @param session
     * @returns
     */
    create(session: DeepPartial<Session>) {
        return this.sessionRepository.save(session);
    }

    /**
     * Update an existing session.
     * @param issuer_state
     * @param values
     * @returns
     */
    add(
        issuer_state: string,
        tenantId: string,
        values: QueryDeepPartialEntity<Session>,
    ) {
        return this.sessionRepository.update(
            { id: issuer_state, tenantId },
            values,
        );
    }

    /**
     * Get all sessions.
     * @returns
     */
    getAll(): Promise<Session[]> {
        return this.sessionRepository.find();
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
}
