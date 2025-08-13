/**
 * Represents the response from an OAuth2 authorization server.
 */
export class Oauth2AuthorizationServerResponse {
    issuer: string;
    /**
     * The URL of the OAuth2 authorization server's token endpoint.
     */
    token_endpoint: string;
    /**
     * The URL of the OAuth2 authorization server's authorization endpoint.
     */
    authorization_endpoint: string;
    /**
     * The URL of the OAuth2 authorization server's jwks (JSON Web Key Set) endpoint.
     */
    jwks_uri: string;
    /**
     * List of supported algorithms to sign the challenge
     */
    code_challenge_methods_supported: string[];
    /**
     * List of supported algorithms for DPoP signing.
     */
    dpop_signing_alg_values_supported: string[];
    /**
     * Indicates whether the server requires pushed authorization requests.
     */
    require_pushed_authorization_requests: boolean;
    /**
     * The URL of the pushed authorization request endpoint.
     */
    pushed_authorization_request_endpoint: string;
    /**
     * The URL of the authorization challenge endpoint.
     */
    authorization_challenge_endpoint: string;
}
