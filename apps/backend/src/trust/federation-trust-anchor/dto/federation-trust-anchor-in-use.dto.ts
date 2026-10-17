import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { FederationTrustAnchorReferenceKind } from "../domain/federation-trust-anchor-reference.js";

/** A configuration of the tenant that names the trust anchor's entity ID. */
export class FederationTrustAnchorReferenceDto {
    @ApiProperty({
        enum: ["PresentationConfig", "IssuanceConfig"],
        description: "Kind of configuration that names the trust anchor.",
    })
    kind!: FederationTrustAnchorReferenceKind;

    @ApiPropertyOptional({
        description:
            "ID of the presentation config. Absent for the issuance configuration, of which a tenant has one, and for configurations the caller may not read.",
    })
    id?: string;

    @ApiPropertyOptional({
        description:
            "Description of the configuration; absent for configurations the caller may not read.",
    })
    description?: string;
}

/**
 * Body of the 409 response when a trust anchor whose entity ID configurations
 * still name is deleted or given another entity ID.
 */
export class FederationTrustAnchorInUseDto {
    @ApiProperty({ description: "HTTP status code.", example: 409 })
    statusCode!: number;

    @ApiProperty({
        description: "Time of the response.",
        example: "2026-10-17T12:00:00.000Z",
    })
    timestamp!: string;

    @ApiProperty({
        description: "Path of the request.",
        example: "/api/federation-trust-anchor/eu-federation",
    })
    path!: string;

    @ApiProperty({
        enum: ["FEDERATION_TRUST_ANCHOR_IN_USE"],
        description: "Configurations still name the trust anchor's entity ID.",
    })
    code!: "FEDERATION_TRUST_ANCHOR_IN_USE";

    @ApiProperty({
        description:
            "Names the configurations the caller may read and counts the others.",
        example:
            'Federation trust anchor "eu-federation" (https://federation.example.eu) is still named by 1 presentation config ("pid") and the issuance configuration (federation.trustAnchors). Remove these references before deleting it.',
    })
    message!: string;

    @ApiProperty({ type: [FederationTrustAnchorReferenceDto] })
    references!: FederationTrustAnchorReferenceDto[];
}
