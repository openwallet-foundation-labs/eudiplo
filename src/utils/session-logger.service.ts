import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';

export interface SessionLogContext {
    sessionId: string;
    tenantId: string;
    flowType: 'OID4VCI' | 'OID4VP';
    stage?: string;
    [key: string]: any;
}

@Injectable()
export class SessionLoggerService {
    constructor(private readonly logger: PinoLogger) {
        this.logger.setContext('SessionLoggerService');
    }

    /**
     * Log session flow start
     */
    logFlowStart(context: SessionLogContext, additionalData?: any) {
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
