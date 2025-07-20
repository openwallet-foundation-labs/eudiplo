import { Module } from '@nestjs/common';
import { SessionService } from './session.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Session } from './entities/session.entity';
import { SessionController } from './session.controller';
import * as Joi from 'joi';
import { StatusListModule } from '../issuer/status-list/status-list.module';

/**
 * Module for managing user sessions.
 */
export const SESSION_VALIDATION_SCHEMA = {
    SESSION_TIDY_UP_INTERVAL: Joi.number().default(60 * 60), // default to every hour
    SESSION_TTL: Joi.number().default(24 * 60 * 60), // default to 24 hours
};

/**
 * SessionModule is responsible for managing user sessions.
 */
@Module({
    imports: [TypeOrmModule.forFeature([Session]), StatusListModule],
    providers: [SessionService],
    exports: [SessionService],
    controllers: [SessionController],
})
export class SessionModule {}
