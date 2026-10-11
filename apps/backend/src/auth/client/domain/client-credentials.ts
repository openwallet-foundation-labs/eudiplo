/** The stored state of a client that decides whether its tokens survive. */
export interface StoredCredentials {
    /** Null or undefined for clients created before 10.0. */
    tokensValidAfter?: Date | null;
}

/**
 * The `tokensValidAfter` of a client stored with a secret. A new client and
 * a changed secret end the tokens issued before; the same secret on an
 * existing client keeps them, also for clients from before 10.0 that have
 * none. `undefined` stores no value.
 *
 * @param previous The stored client, or null for a new one
 * @param sameSecret Whether the secret is the one `previous` has
 */
export function nextTokensValidAfter(
    previous: StoredCredentials | null,
    sameSecret: boolean,
    now = new Date(),
): Date | undefined {
    if (previous && sameSecret) {
        return previous.tokensValidAfter ?? undefined;
    }
    return now;
}
