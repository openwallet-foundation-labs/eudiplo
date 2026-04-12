import {
    ApiExtraModels,
    ApiHideProperty,
    ApiProperty,
    ApiPropertyOptional,
    getSchemaPath,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { TenantEntity } from "../../../../auth/tenant/entitites/tenant.entity";
import { KeyChainEntity } from "../../../../crypto/key/entities/key-chain.entity";
import { SchemaResponse } from "../../../issuance/oid4vci/metadata/dto/schema-response.dto";
import { VCT } from "../../../issuance/oid4vci/metadata/dto/vct.dto";
import { AttributeProviderEntity } from "../../attribute-provider/entities/attribute-provider.entity";
import { KeyAttestationsRequired } from "../../issuance/dto/key-attestations-required.dto";
import { WebhookEndpointEntity } from "../../webhook-endpoint/entities/webhook-endpoint.entity";
import { ClaimMetadata } from "../dto/claim-metadata.dto";
import {
    IaeAction,
    IaeActionBase,
    IaeActionOpenid4vpPresentation,
    IaeActionRedirectToWeb,
    IaeActionType,
} from "./iae-action.dto";
import {
    AllowListPolicy,
    AttestationBasedPolicy,
    EmbeddedDisclosurePolicy,
    NoneTrustPolicy,
    RootOfTrustPolicy,
} from "./policies.dto";

export class DisplayImage {
    @IsString()
    uri!: string;
}
export class Display {
    @IsString()
    name!: string;
    @IsString()
    description!: string;
    @IsString()
    locale!: string;
    @IsOptional()
    @IsString()
    background_color?: string;
    @IsOptional()
    @IsString()
    text_color?: string;
    @IsOptional()
    @ValidateNested()
    @Type(() => DisplayImage)
    background_image?: DisplayImage;
    @IsOptional()
    @ValidateNested()
    @Type(() => DisplayImage)
    logo?: DisplayImage;
}

export enum CredentialFormat {
    MSO_MDOC = "mso_mdoc",
    SD_JWT = "dc+sd-jwt",
}

export class IssuerMetadataCredentialConfig {
    @IsEnum(CredentialFormat)
    format!: CredentialFormat;
    @ValidateNested()
    @Type(() => Display)
    display!: Display[];
    @IsOptional()
    @IsString()
    scope?: string;

    /**
     * Document type for mDOC credentials (e.g., "org.iso.18013.5.1.mDL").
     * Only applicable when format is "mso_mdoc".
     */
    @IsOptional()
    @IsString()
    docType?: string;

    /**
     * Namespace for mDOC credentials (e.g., "org.iso.18013.5.1").
     * Only applicable when format is "mso_mdoc".
     * Used when claims are provided as a flat object.
     */
    @IsOptional()
    @IsString()
    namespace?: string;

    /**
     * Claims organized by namespace for mDOC credentials.
     * Allows specifying claims across multiple namespaces.
     * Only applicable when format is "mso_mdoc".
     * Example:
     * {
     *   "org.iso.18013.5.1": { "given_name": "John", "family_name": "Doe" },
     *   "org.iso.18013.5.1.aamva": { "DHS_compliance": "F" }
     * }
     */
    @IsOptional()
    @IsObject()
    claimsByNamespace?: Record<string, Record<string, any>>;

    /**
     * Claims metadata for wallet rendering.
     * Follows the OID4VCI credential_metadata.claims specification.
     * Each claim includes a path (JSONPath-like array), optional mandatory flag,
     * and display information with multi-language support.
     *
     * Example:
     * [
     *   { "path": ["given_name"], "mandatory": false, "display": [{ "name": "Given Name", "locale": "en-US" }] },
     *   { "path": ["address", "street_address"], "display": [{ "name": "Street Address", "locale": "en-US" }] }
     * ]
     */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ClaimMetadata)
    claimsMetadata?: ClaimMetadata[];

    /**
     * Key attestation requirements for JWT proofs for this credential.
     * When set, this is published in proof_types_supported.jwt.key_attestations_required
     * for this specific credential configuration.
     *
     * @see https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html#appendix-F
     */
    @ApiPropertyOptional({ type: () => KeyAttestationsRequired })
    @ValidateNested()
    @Type(() => KeyAttestationsRequired)
    @IsOptional()
    keyAttestationsRequired?: KeyAttestationsRequired;
}

@ApiExtraModels(
    AttestationBasedPolicy,
    NoneTrustPolicy,
    AllowListPolicy,
    RootOfTrustPolicy,
    VCT,
    IaeActionOpenid4vpPresentation,
    IaeActionRedirectToWeb,
)
@Entity()
export class CredentialConfig {
    @IsString()
    @Column("varchar", { primary: true })
    id!: string;

    @IsString()
    @Column("varchar", { nullable: true })
    description?: string | null;

    @ApiHideProperty()
    @Column("varchar", { primary: true })
    tenantId!: string;

    /**
     * The tenant that owns this object.
     */
    @ManyToOne(() => TenantEntity, { cascade: true, onDelete: "CASCADE" })
    tenant!: TenantEntity;

    @Column("json")
    @ValidateNested()
    @Type(() => IssuerMetadataCredentialConfig)
    config!: IssuerMetadataCredentialConfig;

    @Column("json", { nullable: true })
    @IsOptional()
    @IsObject()
    claims?: Record<string, any> | null;

    /**
     * Reference to the attribute provider used for fetching claims.
     * Optional: if set, claims will be fetched from this provider during issuance.
     */
    @IsOptional()
    @IsString()
    @Column("varchar", { nullable: true })
    attributeProviderId?: string | null;

    @ManyToOne(() => AttributeProviderEntity, {
        createForeignKeyConstraints: false,
    })
    @JoinColumn([
        { name: "attributeProviderId", referencedColumnName: "id" },
        { name: "tenantId", referencedColumnName: "tenantId" },
    ])
    attributeProvider?: AttributeProviderEntity;

    /**
     * Reference to the webhook endpoint used for notifications.
     * Optional: if set, notifications will be sent to this endpoint.
     */
    @IsOptional()
    @IsString()
    @Column("varchar", { nullable: true })
    webhookEndpointId?: string | null;

    @ManyToOne(() => WebhookEndpointEntity, {
        createForeignKeyConstraints: false,
    })
    @JoinColumn([
        { name: "webhookEndpointId", referencedColumnName: "id" },
        { name: "tenantId", referencedColumnName: "tenantId" },
    ])
    webhookEndpoint?: WebhookEndpointEntity;

    // has to be optional since there may be credentials that are disclosed without a frame
    @Column("json", { nullable: true })
    @IsOptional()
    @IsObject()
    disclosureFrame?: Record<string, any> | null;

    @IsOptional()
    @ApiProperty({
        description:
            "VCT as a URI string (e.g., urn:eudi:pid:de:1) or as an object for EUDIPLO-hosted VCT",
        nullable: true,
        oneOf: [
            { type: "string", description: "VCT URI string" },
            { $ref: getSchemaPath(VCT) },
        ],
    })
    @Column("json", { nullable: true })
    vct?: string | VCT | null;

    @IsOptional()
    @Column("boolean", { default: false })
    @IsBoolean()
    keyBinding?: boolean;

    /**
     * Reference to the key chain used for signing.
     * Optional: if not specified, the default attestation key chain will be used.
     */
    @IsOptional()
    @IsString()
    @Column("varchar", { nullable: true })
    keyChainId?: string;

    @ManyToOne(() => KeyChainEntity, { createForeignKeyConstraints: false })
    @JoinColumn([
        { name: "keyChainId", referencedColumnName: "id" },
        { name: "tenantId", referencedColumnName: "tenantId" },
    ])
    keyChain?: KeyChainEntity;

    @IsOptional()
    @Column("boolean", { default: false })
    @IsBoolean()
    statusManagement?: boolean;

    /**
     * List of Interactive Authorization Endpoint (IAE) actions to execute
     * before credential issuance. Actions are executed in order.
     *
     * Each action can be:
     * - `openid4vp_presentation`: Request a verifiable presentation from the wallet
     * - `redirect_to_web`: Redirect user to a web page for additional interaction
     *
     * If empty or not set, no interactive authorization is required.
     *
     * @example
     * [
     *   { "type": "openid4vp_presentation", "presentationConfigId": "pid-config" },
     *   { "type": "redirect_to_web", "url": "https://example.com/verify", "label": "Additional Verification" }
     * ]
     */
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => IaeActionBase, {
        discriminator: {
            property: "type",
            subTypes: [
                {
                    name: IaeActionType.OPENID4VP_PRESENTATION,
                    value: IaeActionOpenid4vpPresentation,
                },
                {
                    name: IaeActionType.REDIRECT_TO_WEB,
                    value: IaeActionRedirectToWeb,
                },
            ],
        },
        keepDiscriminatorProperty: true,
    })
    @ApiProperty({
        description:
            "List of IAE actions to execute before credential issuance",
        type: "array",
        items: {
            oneOf: [
                { $ref: getSchemaPath(IaeActionOpenid4vpPresentation) },
                { $ref: getSchemaPath(IaeActionRedirectToWeb) },
            ],
        },
        nullable: true,
        required: false,
    })
    @Column("json", { nullable: true })
    iaeActions?: IaeAction[] | null;

    @IsOptional()
    @Column("int", { nullable: true })
    @IsNumber()
    lifeTime?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => SchemaResponse)
    @Column("json", { nullable: true })
    schema?: SchemaResponse | null;

    /**
     * Embedded disclosure policy (discriminated union by `policy`).
     * The discriminator makes class-transformer instantiate the right subclass,
     * and then class-validator runs that subclass’s rules.
     */
    @IsOptional()
    @ValidateNested()
    @ApiProperty({
        oneOf: [
            { $ref: getSchemaPath(AttestationBasedPolicy) },
            { $ref: getSchemaPath(NoneTrustPolicy) },
            { $ref: getSchemaPath(AllowListPolicy) },
            { $ref: getSchemaPath(RootOfTrustPolicy) },
        ],
    })
    @Type(() => AttestationBasedPolicy, {
        discriminator: {
            property: "policy",
            subTypes: [
                { name: "none", value: NoneTrustPolicy },
                { name: "allowList", value: AllowListPolicy },
                { name: "rootOfTrust", value: RootOfTrustPolicy },
                {
                    name: "attestationBased",
                    value: AttestationBasedPolicy,
                },
            ],
        },
        keepDiscriminatorProperty: true, // keep `policy` on the instance
    })
    @Column("json", { nullable: true })
    embeddedDisclosurePolicy?: EmbeddedDisclosurePolicy | null;
}
