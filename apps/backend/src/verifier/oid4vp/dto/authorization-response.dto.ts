import { IsBoolean, IsOptional, IsString } from "class-validator";

/**
 * DTO for the authorization response containing the VP token.
 */
export class AuthorizationResponse {
    /**
     * The response string containing the authorization details.
     */
    @IsString()
    response: string;

    /**
     * When set to true, the authorization response will be sent to the client.
     */
    @IsBoolean()
    @IsOptional()
    sendResponse?: boolean;
}
