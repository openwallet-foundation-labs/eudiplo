import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FederationTrustAnchorResponseDto {
    @ApiProperty({ description: "Identifier of the trust anchor" })
    id!: string;

    @ApiProperty({ description: "Tenant identifier" })
    tenantId!: string;

    @ApiProperty({
        description: "Entity identifier of the trust anchor",
        example: "https://ta.example.org",
    })
    entityId!: string;

    @ApiPropertyOptional({
        description: "Description of the trust anchor",
        nullable: true,
        type: String,
    })
    description?: string | null;

    @ApiProperty({
        description:
            "Pinned federation keys of the trust anchor as a JWK set (public keys only)",
        type: "object",
        additionalProperties: true,
    })
    jwks!: { keys: Record<string, unknown>[] };
}
