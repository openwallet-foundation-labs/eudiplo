import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { TrustListReferenceKind } from "../domain/trust-list-reference.js";

/** A configuration of the tenant that references the trust list. */
export class TrustListReferenceDto {
    @ApiProperty({
        enum: ["PresentationConfig", "CredentialConfig", "IssuanceConfig"],
        description: "Kind of configuration that references the trust list.",
    })
    kind!: TrustListReferenceKind;

    @ApiPropertyOptional({
        description:
            "ID of the presentation or credential config. Absent for the issuance configuration, of which a tenant has one, and for configurations the caller may not read.",
    })
    id?: string;

    @ApiPropertyOptional({
        description:
            "Description of the configuration; absent for configurations the caller may not read.",
    })
    description?: string;
}

/** Body of the 409 response when a trust list that is still referenced is deleted. */
export class TrustListInUseDto {
    @ApiProperty({ description: "HTTP status code.", example: 409 })
    statusCode!: number;

    @ApiProperty({
        description: "Time of the response.",
        example: "2026-10-11T12:00:00.000Z",
    })
    timestamp!: string;

    @ApiProperty({
        description: "Path of the request.",
        example: "/api/trust-list/pid-issuers",
    })
    path!: string;

    @ApiProperty({
        enum: ["TRUST_LIST_IN_USE"],
        description: "Configurations still reference the trust list.",
    })
    code!: "TRUST_LIST_IN_USE";

    @ApiProperty({
        description:
            "Names the referencing configurations the caller may read and counts the others.",
        example:
            'Trust list "pid-issuers" is still referenced by 1 presentation config ("pid") and the issuance configuration (wallet provider trust lists). Remove these references before deleting the trust list.',
    })
    message!: string;

    @ApiProperty({ type: [TrustListReferenceDto] })
    references!: TrustListReferenceDto[];
}
