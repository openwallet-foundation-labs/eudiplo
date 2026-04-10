import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";

/**
 * Display information for a claim in a specific locale.
 * Used for rendering claim names in wallet UIs.
 */
export class ClaimDisplayInfo {
    /**
     * Human-readable name for the claim in this locale.
     */
    @IsOptional()
    @IsString()
    @ApiProperty({
        description: "Human-readable name for the claim",
        example: "Given Name",
        required: false,
    })
    name?: string;

    /**
     * Locale identifier (e.g., "en-US", "de-DE").
     */
    @IsOptional()
    @IsString()
    @ApiProperty({
        description: "Locale identifier (e.g., en-US, de-DE)",
        example: "en-US",
        required: false,
    })
    locale?: string;
}

/**
 * Represents a path element in a claim path.
 * Can be a string (object key), number (array index), or null (any element).
 */
export type ClaimPathElement = string | number | null;

/**
 * Metadata for a single claim that should be displayed by the wallet.
 * Follows the OID4VCI credential_metadata.claims specification.
 *
 * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html
 */
export class ClaimMetadata {
    /**
     * JSONPath-like array to identify the claim location.
     * For SD-JWT: e.g., ["given_name"] or ["address", "street_address"]
     * For mDOC: e.g., ["org.iso.18013.5.1", "given_name"]
     */
    @IsArray()
    @ApiProperty({
        description:
            "Path to the claim. For SD-JWT: JSONPath-like array. For mDOC: [namespace, claim_name]",
        example: ["given_name"],
        type: [String || Number || null],
    })
    path!: ClaimPathElement[];

    /**
     * Whether this claim is mandatory to be disclosed.
     * If true, the wallet should always include this claim.
     */
    @IsOptional()
    @IsBoolean()
    @ApiProperty({
        description: "Whether this claim must be disclosed",
        required: false,
        default: false,
    })
    mandatory?: boolean;

    /**
     * Display information for this claim in different locales.
     */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ClaimDisplayInfo)
    @ApiProperty({
        description: "Display information for the claim in different locales",
        type: [ClaimDisplayInfo],
        required: false,
    })
    display?: ClaimDisplayInfo[];
}
