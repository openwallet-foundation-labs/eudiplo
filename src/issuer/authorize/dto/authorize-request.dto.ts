import { IsString } from 'class-validator';

export class AuthorizeQueries {
  @IsString()
  issuer_state: string;
  @IsString()
  response_type: string;
  @IsString()
  client_id: string;
  @IsString()
  redirect_uri: string;
  @IsString()
  resource: string;
  @IsString()
  scope: string;
  @IsString()
  code_challenge: string;
  @IsString()
  code_challenge_method: string;
  @IsString()
  dpop_jkt: string;
  @IsString()
  request_uri: string;
  @IsString()
  auth_session?: string;
}
