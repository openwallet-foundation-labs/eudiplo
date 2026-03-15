import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { LoggerConfigService } from "./logger-config.service";
import { SessionLogStoreService } from "./session-log-store.service";
import { SessionLogContext } from "./session-logger-context";
import { SessionLogLevel } from "../../../session/entities/session-log-entry.entity";

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
     * @param logStore - SessionLogStoreService for persisting logs to DB.
     */
    constructor(
        private readonly logger: PinoLogger,
        private readonly loggerConfigService: LoggerConfigService,
        private readonly logStore: SessionLogStoreService,
    ) {
        this.logger.setContext("SessionLoggerService");
        this.isEnabled = this.loggerConfigService.isSessionLoggerEnabled();
    }

    private persistLog(
        context: SessionLogContext,
        level: SessionLogLevel,
        message: string,
        stage?: string,
        detail?: Record<string, unknown>,
    ): void {
        this.logStore
            .append(context.sessionId, level, message, stage, detail)
            .catch(() => {});
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
                event: "flow_start",
                stage: "initialization",
                ...additionalData,
            },
            message,
        );
        this.persistLog(context, "info", message, "initialization", additionalData);
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
                event: "flow_complete",
                stage: "completion",
                ...additionalData,
            },
            message,
        );
        this.persistLog(context, "info", message, "completion", additionalData);
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
                event: "flow_error",
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                ...additionalData,
            },
            message,
        );
        this.persistLog(context, "error", message, "error", {
            errorName: error.name,
            errorMessage: error.message,
            ...additionalData,
        });
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
                event: "credential_issuance",
                stage: "credential_creation",
                credentialType,
                ...additionalData,
            },
            `[${context.flowType}] Issuing credential of type ${credentialType} for session ${context.sessionId}`,
        );
        this.persistLog(
            context,
            "info",
            `[${context.flowType}] Issuing credential of type ${credentialType} for session ${context.sessionId}`,
            "credential_creation",
            { credentialType, ...additionalData },
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
                event: "credential_verification",
                stage: "verification",
                verificationResult,
                ...additionalData,
            },
            `[${context.flowType}] Credential verification ${verificationResult ? "succeeded" : "failed"} for session ${context.sessionId}`,
        );
        this.persistLog(
            context,
            "info",
            `[${context.flowType}] Credential verification ${verificationResult ? "succeeded" : "failed"} for session ${context.sessionId}`,
            "verification",
            { verificationResult, ...additionalData },
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
                event: "authorization_request",
                stage: "authorization",
                ...additionalData,
            },
            `[${context.flowType}] Authorization request created for session ${context.sessionId}`,
        );
        this.persistLog(
            context,
            "info",
            `[${context.flowType}] Authorization request created for session ${context.sessionId}`,
            "authorization",
            additionalData,
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
                event: "token_exchange",
                stage: "token_exchange",
                ...additionalData,
            },
            `[${context.flowType}] Token exchange for session ${context.sessionId}`,
        );
        this.persistLog(
            context,
            "info",
            `[${context.flowType}] Token exchange for session ${context.sessionId}`,
            "token_exchange",
            additionalData,
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
                event: "notification",
                stage: "notification",
                notificationEvent,
                ...additionalData,
            },
            `[${context.flowType}] Notification ${notificationEvent} for session ${context.sessionId}`,
        );
        this.persistLog(
            context,
            "info",
            `[${context.flowType}] Notification ${notificationEvent} for session ${context.sessionId}`,
            "notification",
            { notificationEvent, ...additionalData },
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
        this.persistLog(
            context,
            "info",
            `[${context.flowType}] ${message}`,
            context.stage,
            additionalData,
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
        this.persistLog(
            context,
            "error",
            `[${context.flowType}] ${message}: ${error.message}`,
            context.stage,
            {
                errorName: error.name,
                errorMessage: error.message,
                ...additionalData,
            },
        );
    }
}
