import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { SessionLogContext } from './session-logger-context';

/**
 * Service for logging session-related events and errors.
 * Uses PinoLogger for structured logging.
 */
@Injectable()
export class SessionLoggerService {
    private readonly isEnabled: boolean;

    /**
     * Constructor for SessionLoggerService.
     * @param logger - PinoLogger instance for logging.
     * @param configService - ConfigService for accessing environment configuration.
     */
    constructor(
        private readonly logger: PinoLogger,
        private readonly configService: ConfigService,
    ) {
        this.logger.setContext('SessionLoggerService');
        this.isEnabled = this.configService.get<boolean>(
            'LOG_ENABLE_SESSION_LOGGER',
            false,
        );
    }

    private shouldLog(): boolean {
        return this.isEnabled;
    }

    /**
     * Log session flow start
     */
    logFlowStart(context: SessionLogContext, additionalData?: any) {
        if (!this.shouldLog()) return;

        const message = `[${context.flowType}] Flow started for session ${context.sessionId} in tenant ${context.tenantId}`;

        this.logger.info(
            {
                ...context,
                event: 'flow_start',
                stage: 'initialization',
                ...additionalData,
            },
            message,
        );
    }

    /**
     * Log session flow completion
     */
    logFlowComplete(context: SessionLogContext, additionalData?: any) {
        if (!this.shouldLog()) return;

        const message = `[${context.flowType}] Flow completed for session ${context.sessionId}`;

        this.logger.info(
            {
                ...context,
                event: 'flow_complete',
                stage: 'completion',
                ...additionalData,
            },
            message,
        );
    }

    /**
     * Log session flow error
     */
    logFlowError(
        context: SessionLogContext,
        error: Error,
        additionalData?: any,
    ) {
        if (!this.shouldLog()) return;

        const message = `[${context.flowType}] Flow error for session ${context.sessionId}: ${error.message}`;

        this.logger.error(
            {
                ...context,
                event: 'flow_error',
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                ...additionalData,
            },
            message,
        );
    }

    /**
     * Log credential issuance step
     */
    logCredentialIssuance(
        context: SessionLogContext,
        credentialType: string,
        additionalData?: any,
    ) {
        if (!this.shouldLog()) return;

        this.logger.info(
            {
                ...context,
                event: 'credential_issuance',
                stage: 'credential_creation',
                credentialType,
                ...additionalData,
            },
            `[${context.flowType}] Issuing credential of type ${credentialType} for session ${context.sessionId}`,
        );
    }

    /**
     * Log credential presentation verification
     */
    logCredentialVerification(
        context: SessionLogContext,
        verificationResult: boolean,
        additionalData?: any,
    ) {
        if (!this.shouldLog()) return;

        this.logger.info(
            {
                ...context,
                event: 'credential_verification',
                stage: 'verification',
                verificationResult,
                ...additionalData,
            },
            `[${context.flowType}] Credential verification ${verificationResult ? 'succeeded' : 'failed'} for session ${context.sessionId}`,
        );
    }

    /**
     * Log authorization request
     */
    logAuthorizationRequest(context: SessionLogContext, additionalData?: any) {
        if (!this.shouldLog()) return;

        this.logger.info(
            {
                ...context,
                event: 'authorization_request',
                stage: 'authorization',
                ...additionalData,
            },
            `[${context.flowType}] Authorization request created for session ${context.sessionId}`,
        );
    }

    /**
     * Log token exchange
     */
    logTokenExchange(context: SessionLogContext, additionalData?: any) {
        if (!this.shouldLog()) return;

        this.logger.info(
            {
                ...context,
                event: 'token_exchange',
                stage: 'token_exchange',
                ...additionalData,
            },
            `[${context.flowType}] Token exchange for session ${context.sessionId}`,
        );
    }

    /**
     * Log notification events
     */
    logNotification(
        context: SessionLogContext,
        notificationEvent: string,
        additionalData?: any,
    ) {
        if (!this.shouldLog()) return;

        this.logger.info(
            {
                ...context,
                event: 'notification',
                stage: 'notification',
                notificationEvent,
                ...additionalData,
            },
            `[${context.flowType}] Notification ${notificationEvent} for session ${context.sessionId}`,
        );
    }

    /**
     * Generic session log method
     */
    logSession(
        context: SessionLogContext,
        message: string,
        additionalData?: any,
    ) {
        if (!this.shouldLog()) return;

        this.logger.info(
            {
                ...context,
                ...additionalData,
            },
            `[${context.flowType}] ${message}`,
        );
    }

    /**
     * Generic session error log method
     */
    logSessionError(
        context: SessionLogContext,
        error: Error,
        message: string,
        additionalData?: any,
    ) {
        if (!this.shouldLog()) return;

        this.logger.error(
            {
                ...context,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                ...additionalData,
            },
            `[${context.flowType}] ${message}: ${error.message}`,
        );
    }
}
