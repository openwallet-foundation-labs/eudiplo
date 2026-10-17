import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

export enum FederationTrustMode {
    FEDERATION_ONLY = "federation-only",
    HYBRID = "hybrid",
}

export enum FederationEntityRole {
    TRUST_ANCHOR = "trust_anchor",
    INTERMEDIATE = "intermediate",
    LEAF = "leaf",
}

const FederationTrustAnchorConfigSchema = z
    .object({
        entityId: z.string(),
        entityConfigurationUri: z.string(),
    })
    .strict();

/** Metadata types the entity configuration of a tenant can publish. */
export enum FederationEntityType {
    CREDENTIAL_ISSUER = "openid_credential_issuer",
    CREDENTIAL_VERIFIER = "openid_credential_verifier",
}

const FederationEntityMetadataSchema = z
    .object({
        organization_name: z.string().optional(),
        contacts: z.array(z.string()).optional(),
        logo_uri: z.string().optional(),
        policy_uri: z.string().optional(),
        homepage_uri: z.string().optional(),
    })
    .strict();

const FederationConfigSchema = z
    .object({
        role: z.enum(FederationEntityRole).optional(),
        mode: z.enum(FederationTrustMode).optional(),
        entityId: z.string().optional(),
        enforceSigningPolicy: z.boolean().optional(),
        cacheTtlSeconds: z.number().optional(),
        trustAnchors: z.array(FederationTrustAnchorConfigSchema),
        entityTypes: z.array(z.enum(FederationEntityType)).optional(),
        authorityHints: z.array(z.string()).optional(),
        entityKeyChainId: z.string().optional(),
        entityConfigurationLifetimeSeconds: z.number().optional(),
        trustMarks: z.array(z.string()).optional(),
        entityMetadata: FederationEntityMetadataSchema.optional(),
        includeTrustChain: z.boolean().optional(),
    })
    .strict();

export class FederationTrustAnchorConfig extends createZodDto(
    FederationTrustAnchorConfigSchema,
) {
    @ApiProperty({
        description: "Entity identifier (sub) of the federation trust anchor.",
        example: "https://ta.example.org",
    })
    entityId!: string;

    @ApiProperty({
        description:
            "Federation endpoint URL for the trust anchor entity configuration.",
        example: "https://ta.example.org/.well-known/openid-federation",
    })
    entityConfigurationUri!: string;
}

export class FederationEntityMetadata extends createZodDto(
    FederationEntityMetadataSchema,
) {
    @ApiPropertyOptional({ example: "Example Issuer GmbH" })
    organization_name?: string;

    @ApiPropertyOptional({ type: [String], example: ["ops@example.org"] })
    contacts?: string[];

    @ApiPropertyOptional({ example: "https://example.org/logo.png" })
    logo_uri?: string;

    @ApiPropertyOptional({ example: "https://example.org/privacy" })
    policy_uri?: string;

    @ApiPropertyOptional({ example: "https://example.org" })
    homepage_uri?: string;
}

export class FederationConfig extends createZodDto(FederationConfigSchema) {
    @ApiPropertyOptional({
        enum: FederationEntityRole,
        description:
            "Role this tenant plays in the OpenID Federation topology.",
        default: FederationEntityRole.LEAF,
    })
    role?: FederationEntityRole;

    @ApiPropertyOptional({
        enum: FederationTrustMode,
        description:
            "Trust decision strategy when both LoTE trust lists and OpenID Federation are configured.",
        default: FederationTrustMode.HYBRID,
    })
    mode?: FederationTrustMode;

    @ApiPropertyOptional({
        description:
            "Entity identifier of this issuer/verifier in the federation.",
        example: "https://issuer.example.org",
    })
    entityId?: string;

    @ApiPropertyOptional({
        description:
            "Whether federation checks are enforced for upstream metadata and signer trust decisions.",
        default: true,
    })
    enforceSigningPolicy?: boolean;

    @ApiPropertyOptional({
        description:
            "Cache TTL in seconds for federation entity statements and trust chain results.",
        default: 300,
    })
    cacheTtlSeconds?: number;

    @ApiProperty({
        type: () => [FederationTrustAnchorConfig],
        description: "Configured federation trust anchors.",
    })
    trustAnchors!: FederationTrustAnchorConfig[];

    @ApiPropertyOptional({
        enum: FederationEntityType,
        isArray: true,
        description:
            "Roles the entity configuration publishes metadata for. openid_credential_issuer adds the credential issuer metadata (and the built-in authorization server metadata when it is used), openid_credential_verifier the OID4VP verifier metadata.",
        default: [FederationEntityType.CREDENTIAL_ISSUER],
    })
    entityTypes?: FederationEntityType[];

    @ApiPropertyOptional({
        type: [String],
        description:
            "authority_hints of the entity configuration: entity ids of the superiors that issue a subordinate statement about this entity. Defaults to the trust anchor entity ids.",
        example: ["https://ta.example.org"],
    })
    authorityHints?: string[];

    @ApiPropertyOptional({
        description:
            "Key chain with usage type 'federation' that signs the entity configuration. Without it, a federation key chain of the tenant is used; set it when the tenant has several.",
    })
    entityKeyChainId?: string;

    @ApiPropertyOptional({
        description:
            "Lifetime (exp - iat) of the entity configuration in seconds.",
        default: 86400,
    })
    entityConfigurationLifetimeSeconds?: number;

    @ApiPropertyOptional({
        type: [String],
        description:
            "Trust mark JWTs issued to this entity, published in the entity configuration.",
    })
    trustMarks?: string[];

    @ApiPropertyOptional({
        type: () => FederationEntityMetadata,
        description:
            "Informational federation_entity metadata of the entity configuration.",
    })
    entityMetadata?: FederationEntityMetadata;

    @ApiPropertyOptional({
        description:
            "Add the trust chain of this entity as trust_chain header to federation SD-JWT VCs and OID4VP request objects.",
        default: false,
    })
    includeTrustChain?: boolean;
}
