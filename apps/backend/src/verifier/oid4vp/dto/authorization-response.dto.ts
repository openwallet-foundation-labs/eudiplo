import { IsBoolean, IsOptional, IsString, ValidateIf } from "class-validator";

/**
 * DTO for the authorization response containing either a VP token (success) or
 * an OAuth 2.0 error response (when wallet cannot fulfill the request).
 *
 * Per OID4VP spec section 6.2, wallets can return error responses with:
 * - error (required)
 * - error_description (optional)
 * - error_uri (optional)
 * - state (required if present in the request)
 *
 * @see https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-error-response
 */
export class AuthorizationResponse {
    /**
     * The response string containing the authorization details (JWE-encrypted VP token).
     * Required for success responses, absent for error responses.
     */
    @IsString()
    @ValidateIf((o) => !o.error)
    response?: string;

    /**
     * When set to true, the authorization response will be sent to the client.
     */
    @IsBoolean()
    @IsOptional()
    sendResponse?: boolean;

    // OAuth 2.0 Authorization Error Response fields (per RFC 6749 section 4.1.2.1)

    /**
     * Error code indicating why the wallet could not fulfill the request.
     * Common values: invalid_request, unauthorized_client, access_denied,
     * unsupported_response_type, invalid_scope, server_error, temporarily_unavailable.
     */
    @IsString()
    @ValidateIf((o) => !o.response)
    error?: string;

    /**
     * Human-readable description of the error.
     */
    @IsString()
    @IsOptional()
    error_description?: string;

    /**
     * URI with additional information about the error.
     */
    @IsString()
    @IsOptional()
    error_uri?: string;

    /**
     * State value from the authorization request (for correlation).
     */
    @IsString()
    @IsOptional()
    state?: string;
}
