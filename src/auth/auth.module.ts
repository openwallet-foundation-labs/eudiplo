import { Module } from '@nestjs/common';
import * as Joi from 'joi';

export const AUTH_VALIDATION_SCHEMA = {
    AUTH_API_KEY: Joi.string().required(),
};

@Module({})
export class AuthModule {}
