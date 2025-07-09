import { IsString } from 'class-validator';

export class AuthorizationResponse {
    /**
     * The response string containing the authorization details.
     */
    @IsString()
    response: string;
}
