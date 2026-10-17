import type { CredentialOfferObject } from "@openid4vc/openid4vci";
import type {
    ExternalSessionBinding,
    NewSession,
    SessionData,
    SessionResultUpdate,
    SessionUpdate,
} from "../domain/session-data.js";
import type {
    SessionListQuery,
    SessionSummary,
    SessionType,
} from "../domain/session-list.js";
import type {
    SessionLifecycleContext,
    SessionStateUpdate,
    SessionStatus,
} from "../domain/session-state.js";
import type {
    MAX_FAILURE_CODE_LENGTH,
    SessionCountFilter,
    SessionFailureCodeCount,
    SessionTypeStatusCount,
} from "../domain/session-stats.js";

export const SESSION_REPOSITORY = Symbol("SESSION_REPOSITORY");

/** The offer view is deliberately independent of the persisted Session entity. */
export interface SessionCredentialOffer {
    id: string;
    offer: CredentialOfferObject | null;
    status: SessionStatus;
    expiresAt?: Date;
}

/** Number of sessions of a tenant per kind and status. */
export interface SessionCount {
    tenantId: string;
    kind: "issuance" | "verification";
    status: SessionStatus;
    count: number;
}

/** Migrated session operations. Extend by use case, never with ORM query types. */
export interface SessionRepository {
    create(session: NewSession): Promise<SessionData>;
    updateForTenant(
        tenantId: string,
        id: string,
        update: SessionUpdate,
    ): Promise<number>;
    /**
     * Apply the update only while the session is not yet consumed, still open
     * (not in a terminal status) and not past `expiresAt`. Exactly one of
     * several concurrent callers wins; return whether this call did.
     */
    updateUnconsumedForTenant(
        tenantId: string,
        id: string,
        update: SessionUpdate,
    ): Promise<boolean>;
    /** With `type`, a session of the other type is not found. */
    findForTenant(
        tenantId: string,
        id: string,
        type?: SessionType,
    ): Promise<SessionData | null>;
    /**
     * Redeem a PAR `request_uri` once (RFC 9126 Section 7.3): set its expiry to
     * `now` only while it still equals `expiresAt` and lies after `now`.
     * Exactly one of several concurrent callers wins; return whether this call did.
     */
    consumeRequestUri(
        tenantId: string,
        id: string,
        expiresAt: Date,
        now: Date,
    ): Promise<boolean>;
    /** Internal flow correlation only; never use an untrusted management request ID. */
    findByIdForInternalFlow(id: string): Promise<SessionData | null>;
    /**
     * The OID4VP presentation session of a wallet-facing nonce; never by
     * session ID, never an ISO 18013-7 session.
     */
    findForWalletRequest(nonce: string): Promise<SessionData | null>;
    /**
     * The issuance session of a wallet reference (`walletNonce`): the value of
     * `issuer_state`, the `credential_offer_uri` and external token bindings.
     * Never by session ID.
     */
    findIssuanceForWalletReference(
        tenantId: string,
        reference: string,
    ): Promise<SessionData | null>;
    /** The ISO 18013-7 session of a wallet nonce; never by session ID. */
    findIso18013Session(walletNonce: string): Promise<SessionData | null>;
    /** Session holding this code hash (only the hash of a code is stored). */
    findByAuthorizationCode(
        tenantId: string,
        codeHash: string,
    ): Promise<SessionData | null>;
    /** Session holding this refresh token hash (only the hash is stored). */
    findByRefreshToken(
        tenantId: string,
        refreshTokenHash: string,
    ): Promise<SessionData | null>;
    findByRequestUri(
        tenantId: string,
        uri: string,
    ): Promise<SessionData | null>;
    /** Bind only an existing active session for the configured server; return the pre-update snapshot. */
    bindExternalAuthorization(
        binding: ExternalSessionBinding,
    ): Promise<SessionData | null>;

    /**
     * Atomically increment, then read the current count in the same tenant scope.
     * Concurrent callers may observe the same count; no increments may be lost.
     * Return null if the session is missing.
     */
    incrementFailedTxCodeAttempts(
        tenantId: string,
        sessionId: string,
    ): Promise<number | null>;

    listForTenant(
        tenantId: string,
        query: SessionListQuery,
    ): Promise<{ items: SessionSummary[]; total: number }>;
    /** The tenant's session counts per type and status; empty ones are omitted. */
    countForTenant(
        tenantId: string,
        filter: SessionCountFilter,
    ): Promise<SessionTypeStatusCount[]>;
    /**
     * The `limit` most frequent failure codes of the tenant's failed sessions of
     * one type, most frequent first. Sessions without a code are omitted, and
     * codes are cut to {@link MAX_FAILURE_CODE_LENGTH} characters.
     */
    topFailureCodesForTenant(
        tenantId: string,
        filter: SessionCountFilter & { type: SessionType },
        limit: number,
    ): Promise<SessionFailureCodeCount[]>;
    /** Last update of the tenant's most recently updated session of this type and status. */
    lastUpdatedForTenant(
        tenantId: string,
        filter: SessionCountFilter & {
            type: SessionType;
            status: SessionStatus;
        },
    ): Promise<Date | null>;
    /**
     * Missing sessions, sessions owned by another tenant and, with `type`,
     * sessions of the other type are all no-ops.
     */
    deleteForTenant(
        tenantId: string,
        sessionId: string,
        type?: SessionType,
    ): Promise<void>;

    /**
     * Privileged cross-tenant selection of sessions overdue before `before`:
     * open presentations, and issuance offers that were never redeemed
     * (active and not consumed).
     */
    findExpiredSessionsForMaintenance(
        before: Date,
    ): Promise<SessionLifecycleContext[]>;
    /** Privileged cross-tenant counts; tenants without sessions are omitted. */
    countSessionsByStatus(): Promise<SessionCount[]>;
    deleteSessionsCreatedBefore(
        tenantId: string,
        cutoff: Date,
    ): Promise<number>;
    anonymizeSessionsCreatedBefore(
        tenantId: string,
        cutoff: Date,
    ): Promise<number>;
    /** An empty known-tenant list must be a no-op, never a global delete. */
    deleteOrphanedSessionsCreatedBefore(
        knownTenantIds: string[],
        cutoff: Date,
    ): Promise<number>;

    /** Preserve existing update semantics; no compare-and-set or deduplication. */
    changeState(
        tenantId: string,
        sessionId: string,
        update: SessionStateUpdate,
    ): Promise<void>;
    /**
     * Compare-and-set: apply the state update (and the result fields written
     * with it) only while the status is one of `from`. Return whether this
     * call changed the session.
     */
    changeStateFrom(
        tenantId: string,
        sessionId: string,
        from: readonly SessionStatus[],
        update: SessionStateUpdate & SessionResultUpdate,
    ): Promise<boolean>;

    /** The offer of the issuance session with this wallet reference. */
    findCredentialOffer(
        tenantId: string,
        walletReference: string,
    ): Promise<SessionCredentialOffer | null>;

    /**
     * Atomically clear a non-null offer for this tenant. Exactly one concurrent
     * caller wins. Preserve consumedAt if already set; do not change consumed.
     */
    consumeCredentialOffer(
        tenantId: string,
        sessionId: string,
    ): Promise<boolean>;
}
