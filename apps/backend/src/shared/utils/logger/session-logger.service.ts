import { Injectable } from "@nestjs/common";
import { PinoLogger } from "nestjs-pino";
import { SessionLogLevel } from "../../../session/entities/session-log-entry.entity";
import { LoggerConfigService } from "./logger-config.service";
import { SessionLogStoreService } from "./session-log-store.service";
import { SessionLogContext } from "./session-logger-context";

/**
 * Service for logging session-related events and errors.
 * Uses PinoLogger for structured logging.
 *
 * **Audit vs Debug Logging Strategy:**
 * - **Audit events** (persisted to DB): flow_start, flow_complete, flow_error,
 *   credential_issuance, credential_verification - these create a permanent audit
 *   trail visible in the client UI and useful for compliance/proof.
 * - **Debug events** (pino → OTel → Loki only): authorization_request, token_exchange,
 *   notification, generic session logs - available in Loki for debugging but not
 *   persisted to DB to reduce write overhead.
 */
@Injectable()
export class SessionLoggerService {
    private readonly isEnabled: boolean;
    private readonly verbose: boolean;

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
        this.verbose = this.loggerConfigService.isVerboseMode();
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
     * Log session flow start (audit event - persisted to DB)
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
        this.persistLog(
            context,
            "info",
            message,
            "initialization",
            additionalData,
        );
    }

    /**
     * Log session flow completion (audit event - persisted to DB)
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
     * Log session flow error (audit event - persisted to DB)
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
            ...(this.verbose && { errorStack: error.stack }),
            ...additionalData,
        });
    }

    /**
     * Log credential issuance step (audit event - persisted to DB)
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
     * Log credential presentation verification (audit event - persisted to DB)
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
     * Log authorization request (debug only - not persisted to DB)
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
        // Debug event: logged to pino (→ OTel → Loki) only, not persisted to DB
    }

    /**
     * Log token exchange (debug only - not persisted to DB)
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
        // Debug event: logged to pino (→ OTel → Loki) only, not persisted to DB
    }

    /**
     * Log notification events (debug only - not persisted to DB)
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
        // Debug event: logged to pino (→ OTel → Loki) only, not persisted to DB
    }

    /**
     * Generic session log method (debug only - not persisted to DB)
     * Use specific audit methods (logFlowStart, logFlowComplete, etc.) for audit trail.
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
        // Debug event: logged to pino (→ OTel → Loki) only, not persisted to DB
    }

    /**
     * Generic session error log method (audit event - persisted to DB)
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
                ...(this.verbose && { errorStack: error.stack }),
                ...additionalData,
            },
        );
    }
}
