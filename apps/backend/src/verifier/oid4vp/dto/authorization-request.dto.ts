import { IsOptional, IsString } from "class-validator";

/**
 * DTO including wallet metadata according to https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-request-uri-method-post
 */
export class AuthorizationResponse {
    /**
     * JSON encoded wallet metadata
     */
    @IsString()
    @IsOptional()
    wallet_metadata?: string;

    @IsString()
    @IsOptional()
    wallet_nonce?: string;
}
