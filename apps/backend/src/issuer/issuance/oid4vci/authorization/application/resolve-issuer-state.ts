import { SessionNotFound } from "../../../../../session/application/session-errors.js";
import type { SessionStore } from "../../../../../session/application/session-store.js";
import {
    assertSessionUsable,
    SessionNotUsable,
} from "../../../../../session/domain/session-usability.js";

export class InvalidIssuerState extends Error {
    constructor(options?: ErrorOptions) {
        super("Invalid issuer_state", options);
        this.name = "InvalidIssuerState";
    }
}

/**
 * The ID of the offer session that an authorization request's `issuer_state`
 * names. The `issuer_state` is the offer's wallet reference, never its
 * session ID; from here on the session ID stands for the offer.
 * @throws InvalidIssuerState when no usable offer has this wallet reference
 */
export class ResolveIssuerState {
    constructor(
        private readonly sessions: Pick<
            SessionStore,
            "getIssuanceForWalletReference"
        >,
    ) {}

    async execute(
        tenantId: string,
        issuerState: string,
        now = new Date(),
    ): Promise<string> {
        try {
            const offer = await this.sessions.getIssuanceForWalletReference(
                tenantId,
                issuerState,
            );
            assertSessionUsable(offer, now);
            return offer.id;
        } catch (error) {
            if (
                error instanceof SessionNotFound ||
                error instanceof SessionNotUsable
            )
                throw new InvalidIssuerState({ cause: error });
            throw error;
        }
    }
}
