import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * OID4VCI Credential Request Error Codes as defined in:
 * https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#name-credential-request-errors
 */
export type CredentialRequestErrorCode =
    | "invalid_credential_request"
    | "unknown_credential_configuration"
    | "unknown_credential_identifier"
    | "invalid_proof"
    | "invalid_nonce"
    | "invalid_encryption_parameters"
    | "credential_request_denied";

/**
 * Exception for OID4VCI Credential Request errors.
 *
 * According to the OID4VCI specification (Section 8.3.1.2), the response
 * MUST use HTTP status code 400 and contain `error` and optionally `error_description`.
 *
 * Error codes:
 * - `invalid_credential_request`: The Credential Request is missing a required parameter,
 *   includes an unsupported parameter or parameter value, repeats the same parameter,
 *   or is otherwise malformed.
 * - `unknown_credential_configuration`: Requested Credential Configuration is unknown.
 * - `unknown_credential_identifier`: Requested Credential identifier is unknown.
 * - `invalid_proof`: The `proofs` parameter in the Credential Request is invalid:
 *   (1) if the field is missing, or (2) one of the provided key proofs is invalid,
 *   or (3) if at least one of the key proofs does not contain a `c_nonce` value.
 * - `invalid_nonce`: The `proofs` parameter in the Credential Request uses an invalid nonce.
 * - `invalid_encryption_parameters`: Encryption parameters are either invalid or missing
 *   when the Credential Issuer requires encrypted responses.
 * - `credential_request_denied`: The Credential Request has not been accepted.
 *   The Wallet SHOULD treat this error as unrecoverable.
 */
export class CredentialRequestException extends HttpException {
    constructor(error: CredentialRequestErrorCode, errorDescription?: string) {
        const response: {
            error: CredentialRequestErrorCode;
            error_description?: string;
        } = {
            error,
        };
        if (errorDescription) {
            response.error_description = errorDescription;
        }
        super(response, HttpStatus.BAD_REQUEST);
    }
}
