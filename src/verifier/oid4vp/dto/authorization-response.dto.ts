import { IsString } from 'class-validator';

export class AuthorizationResponse {
  @IsString()
  response: string;
}
