import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString } from "class-validator";

/**
 * Represents the key attestations required for issuing credentials.
 * This is published in the credential issuer metadata under
 * proof_types_supported[proof_type].key_attestations_required
 *
 * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#appendix-F
 */
export class KeyAttestationsRequired {
    /**
     * List of key storage types required.
     * Common values for HAIP:
     * - "iso_18045_high": High assurance hardware-backed key storage
     * - "iso_18045_moderate": Moderate assurance key storage
     *
     * @example ["iso_18045_high", "iso_18045_moderate"]
     */
    @ApiPropertyOptional({
        description:
            "List of required key storage types (e.g., iso_18045_high, iso_18045_moderate)",
        type: [String],
        example: ["iso_18045_high", "iso_18045_moderate"],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    key_storage?: string[];

    /**
     * List of user authentication types required.
     * Common values for HAIP:
     * - "iso_18045_high": High assurance user authentication
     * - "iso_18045_moderate": Moderate assurance user authentication
     *
     * @example ["iso_18045_high", "iso_18045_moderate"]
     */
    @ApiPropertyOptional({
        description:
            "List of required user authentication types (e.g., iso_18045_high, iso_18045_moderate)",
        type: [String],
        example: ["iso_18045_high", "iso_18045_moderate"],
    })
    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    user_authentication?: string[];
}
