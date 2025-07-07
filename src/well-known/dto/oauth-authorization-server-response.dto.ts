export class Oauth2AuthorizationServerResponse {
  issuer: string;
  token_endpoint: string;
  authorization_endpoint: string;
  jwks_uri: string;
  code_challenge_methods_supported: string[];
  dpop_signing_alg_values_supported: string[];
  require_pushed_authorization_requests: boolean;
  pushed_authorization_request_endpoint: string;
  authorization_challenge_endpoint: string;
}
