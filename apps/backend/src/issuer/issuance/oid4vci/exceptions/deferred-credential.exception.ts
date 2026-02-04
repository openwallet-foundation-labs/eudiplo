import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * OID4VCI Deferred Credential Error Codes as defined in:
 * https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-deferred-credential-error-r
 */
export type DeferredCredentialErrorCode =
    | "issuance_pending"
    | "invalid_transaction_id";

/**
 * Exception for OID4VCI Deferred Credential errors.
 *
 * According to the OID4VCI specification (Section 9.3), the response
 * depends on the error type:
 *
 * - `issuance_pending`: HTTP 400 - The credential issuance is still pending.
 *   The response includes an optional `interval` field indicating the
 *   minimum amount of time in seconds the Wallet needs to wait before
 *   calling the Deferred Credential Endpoint again.
 *
 * - `invalid_transaction_id`: HTTP 400 - The transaction_id is invalid
 *   (e.g., not found, already used, or expired).
 */
export class DeferredCredentialException extends HttpException {
    constructor(
        error: DeferredCredentialErrorCode,
        errorDescription?: string,
        interval?: number,
    ) {
        const response: {
            error: DeferredCredentialErrorCode;
            error_description?: string;
            interval?: number;
        } = {
            error,
        };
        if (errorDescription) {
            response.error_description = errorDescription;
        }
        // Include interval for issuance_pending to tell wallet when to retry
        if (error === "issuance_pending" && interval !== undefined) {
            response.interval = interval;
        }
        super(response, HttpStatus.BAD_REQUEST);
    }
}
