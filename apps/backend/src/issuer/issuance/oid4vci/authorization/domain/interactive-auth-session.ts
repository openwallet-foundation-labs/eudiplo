export enum InteractiveAuthSessionStatus {
    Pending = "pending",
    AllStepsCompleted = "all_steps_completed",
}

/**
 * State of an Interactive Authorization Endpoint exchange (`auth_session`).
 * JSON-valued fields (`authorizationDetails`, `iaeActions`,
 * `completedStepsData`, `dpopJwk`) are stored serialized.
 */
export interface InteractiveAuthSession {
    id: string;
    authSession: string;
    tenantId: string;
    clientId: string;
    redirectUri?: string;
    scope?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
    issuerState?: string;
    state?: string;
    authorizationDetails?: string;
    interactionTypesSupported: string;
    dpopJwk?: string;
    /** An {@link InteractiveAuthSessionStatus} or a step-specific status. */
    status: string;
    requestUri?: string;
    parExpiresAt?: Date;
    presentationData?: string;
    /**
     * ID of the verifier session of the current OpenID4VP step. Not the
     * `auth_session`: the management API lists session IDs.
     */
    presentationSessionId?: string | null;
    iaeActions?: string;
    currentStepIndex: number;
    completedStepsData?: string;
    authorizationCode?: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
