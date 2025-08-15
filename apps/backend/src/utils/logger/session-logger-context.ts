/**
 * Context for session logging, including session ID, tenant ID, flow type, and optional stage.
 */

export interface SessionLogContext {
    /**
     * Unique identifier for the session.
     */
    sessionId: string;
    /**
     * Identifier for the tenant associated with the session.
     */
    tenantId: string;
    /**
     * Type of flow being logged (e.g., OID4VCI, OID4VP).
     */
    flowType: "OID4VCI" | "OID4VP";
    /**
     * Optional stage of the flow, useful for tracking progress.
     */
    stage?: string;
    /**
     * Additional context information for the session.
     */
    [key: string]: any;
}
