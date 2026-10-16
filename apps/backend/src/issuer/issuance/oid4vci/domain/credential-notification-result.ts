import type { SessionOutcome } from "../../../../session/domain/session-outcome.js";

/** Status and outcome fields for an OID4VCI notification event. */
export function credentialNotificationResult(
    event: "credential_accepted" | "credential_failure" | "credential_deleted",
    description?: string,
): {
    outcome: SessionOutcome;
    failureCode: string | null;
    errorReason: string | null;
} {
    if (event === "credential_accepted") {
        // Clears the failure of an earlier event, so the fields agree.
        return {
            outcome: { result: "success", source: "wallet" },
            failureCode: null,
            errorReason: null,
        };
    }
    // OID4VCI 1.0 §11.1: credential_deleted means a user action stopped the
    // issuance, credential_failure any other reason.
    const message =
        event === "credential_deleted"
            ? "The wallet user rejected the credential"
            : "The wallet could not store the credential";
    return {
        outcome: {
            result: "failed",
            source: "wallet",
            error: event,
            message,
            ...(description ? { description } : {}),
        },
        failureCode: event,
        errorReason: message,
    };
}
