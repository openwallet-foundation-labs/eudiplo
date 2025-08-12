import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { makeGaugeProvider } from '@willsoto/nestjs-prometheus';
import * as Joi from 'joi';
import { StatusListModule } from '../issuer/status-list/status-list.module';
import { Session } from './entities/session.entity';
import { SessionController } from './session.controller';
import { SessionService } from './session.service';

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
  providers: [
    SessionService,
    makeGaugeProvider({
      name: 'sessions',
      help: 'Total number of sessions by status',
      labelNames: ['tenant_id', 'session_type', 'status'],
    }),
  ],
  exports: [SessionService],
  controllers: [SessionController],
})
export class SessionModule {}
