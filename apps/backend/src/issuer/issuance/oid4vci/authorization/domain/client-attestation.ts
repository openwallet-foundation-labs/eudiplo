import { OAuthError } from "./oauth-error.js";

/**
 * Run the wallet attestation check of an authorization server and turn a
 * rejected attestation into an `invalid_client` {@link OAuthError}
 * (RFC 6749 Section 5.2, RFC 9126 Section 2.3): every error of the check
 * rejects the client, at the token endpoint as a failed client
 * authentication (HTTP 401). Used at the PAR endpoints of all servers and
 * the token endpoints of chained and OID4VP servers.
 *
 * The reason names trust lists, certificates or status list URIs, so it goes
 * to `logDetail` and is not returned to the wallet.
 *
 * @param endpoint The endpoint the attestation was presented at
 * @param verify The attestation check
 * @param context Names the tenant and server in the log entry
 * @throws {OAuthError} `invalid_client`
 */
export async function verifyClientAttestation(
    endpoint: "par" | "token",
    verify: () => Promise<void>,
    context: string,
): Promise<void> {
    try {
        await verify();
    } catch (error) {
        throw new OAuthError(
            "invalid_client",
            "Client attestation validation failed",
            {
                clientAuthenticationFailed: endpoint === "token",
                logDetail: `Client attestation validation failed for ${context}: ${error instanceof Error ? error.message : "Unknown error"}`,
            },
        );
    }
}
