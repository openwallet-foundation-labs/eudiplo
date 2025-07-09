import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { Session } from './entities/session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, FindOptionsWhere, LessThan, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { Interval } from '@nestjs/schedule';

@Injectable()
export class SessionService implements OnApplicationBootstrap {
    constructor(
        @InjectRepository(Session)
        private sessionRepository: Repository<Session>,
    ) {}

    onApplicationBootstrap() {
        return this.tidyUpSessions();
    }

    create(session: DeepPartial<Session>) {
        return this.sessionRepository.save(session);
    }

    add(issuer_state: string, values: QueryDeepPartialEntity<Session>) {
        return this.sessionRepository.update({ id: issuer_state }, values);
    }

    getAll(): Promise<Session[]> {
        return this.sessionRepository.find();
    }

    get(state: string) {
        return this.sessionRepository.findOneByOrFail({ id: state });
    }

    getBy(where: FindOptionsWhere<Session>) {
        return this.sessionRepository.findOneByOrFail(where);
    }

    /**
     * Tidy up sessions that are older than 1 day.
     */
    @Interval(60 * 60 * 1000) // every hour
    tidyUpSessions() {
        return this.sessionRepository.delete({
            createdAt: LessThan(new Date(Date.now() - 60 * 60 * 24 * 1000)),
        });
    }
}
