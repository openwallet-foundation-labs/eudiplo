export class AuthorizeQueries {
  issuer_state: string;
  response_type: string;
  client_id: string;
  redirect_uri: string;
  resource: string;
  scope: string;
  code_challenge: string;
  code_challenge_method: string;
  dpop_jkt: string;
  request_uri: string;
  auth_session?: string;
}
