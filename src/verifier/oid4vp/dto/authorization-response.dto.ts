import { IsString } from 'class-validator';

/**
 * DTO for the authorization response containing the VP token.
 */
export class AuthorizationResponse {
    /**
     * The response string containing the authorization details.
     */
    @IsString()
    response: string;
}
