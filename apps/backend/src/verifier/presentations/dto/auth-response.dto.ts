import { IsObject, IsOptional, IsString } from "class-validator";

/**
 * AuthResponse DTO
 */
export class AuthResponse {
    /**
     * The VP token containing the presentation data.
     */
    @IsObject()
    vp_token: {
        /**
         * Key-value pairs representing the VP token data.
         */
        [key: string]: string;
    };
    /**
     * The state parameter to maintain state between the request and callback.
     */
    @IsString()
    @IsOptional()
    state?: string;
}
