import { Module } from "@nestjs/common";

/**
 * Shared Module - Cross-cutting concerns and utilities
 *
 * Responsibilities:
 * - Common filters, guards, interceptors
 * - Shared utilities (config, logger, mediaType, webhook)
 * - Configuration management
 */
@Module({})
export class SharedModule {}
