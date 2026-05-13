import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";

export enum FederationTrustMode {
    FEDERATION_ONLY = "federation-only",
    HYBRID = "hybrid",
}

export enum FederationEntityRole {
    TRUST_ANCHOR = "trust_anchor",
    INTERMEDIATE = "intermediate",
    LEAF = "leaf",
}

export class FederationTrustAnchorConfig {
    @ApiProperty({
        description: "Entity identifier (sub) of the federation trust anchor.",
        example: "https://ta.example.org",
    })
    @IsString()
    entityId!: string;

    @ApiProperty({
        description:
            "Federation endpoint URL for the trust anchor entity configuration.",
        example: "https://ta.example.org/.well-known/openid-federation",
    })
    @IsString()
    entityConfigurationUri!: string;
}

export class FederationConfig {
    @ApiPropertyOptional({
        enum: FederationEntityRole,
        description:
            "Role this tenant plays in the OpenID Federation topology.",
        default: FederationEntityRole.LEAF,
    })
    @IsOptional()
    @IsEnum(FederationEntityRole)
    role?: FederationEntityRole;

    @ApiPropertyOptional({
        enum: FederationTrustMode,
        description:
            "Trust decision strategy when both LoTE trust lists and OpenID Federation are configured.",
        default: FederationTrustMode.HYBRID,
    })
    @IsOptional()
    @IsEnum(FederationTrustMode)
    mode?: FederationTrustMode;

    @ApiPropertyOptional({
        description:
            "Entity identifier of this issuer/verifier in the federation.",
        example: "https://issuer.example.org",
    })
    @IsOptional()
    @IsString()
    entityId?: string;

    @ApiPropertyOptional({
        description:
            "Whether federation checks are enforced for upstream metadata and signer trust decisions.",
        default: true,
    })
    @IsOptional()
    @IsBoolean()
    enforceSigningPolicy?: boolean;

    @ApiPropertyOptional({
        description:
            "Cache TTL in seconds for federation entity statements and trust chain results.",
        default: 300,
    })
    @IsOptional()
    @IsNumber()
    cacheTtlSeconds?: number;

    @ApiProperty({
        type: () => [FederationTrustAnchorConfig],
        description: "Configured federation trust anchors.",
    })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => FederationTrustAnchorConfig)
    trustAnchors!: FederationTrustAnchorConfig[];
}
