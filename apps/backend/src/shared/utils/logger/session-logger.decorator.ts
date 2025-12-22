import { SetMetadata } from "@nestjs/common";

/**
 * Key for session logger metadata.
 */
export const SESSION_LOGGER_KEY = "session-logger";

/**
 * Decorator to mark methods that should have session-based logging
 * @param sessionIdParam - The parameter name that contains the session ID (e.g., 'session', 'state')
 * @param flowType - The type of flow ('OID4VCI' | 'OID4VP')
 */
export const SessionLogger = (
    sessionIdParam: string,
    flowType: "OID4VCI" | "OID4VP",
) => SetMetadata(SESSION_LOGGER_KEY, { sessionIdParam, flowType });
