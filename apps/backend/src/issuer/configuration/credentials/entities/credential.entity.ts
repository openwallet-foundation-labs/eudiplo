import {
    ApiExtraModels,
    ApiHideProperty,
    ApiProperty,
    getSchemaPath,
} from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsBoolean,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { Column, Entity, ManyToOne } from "typeorm";
import { TenantEntity } from "../../../../auth/tenant/entitites/tenant.entity";
import { CertEntity } from "../../../../crypto/key/entities/cert.entity";
import { WebhookConfig } from "../../../../shared/utils/webhook/webhook.dto";
import { SchemaResponse } from "../../../issuance/oid4vci/metadata/dto/schema-response.dto";
import { VCT } from "../../../issuance/oid4vci/metadata/dto/vct.dto";
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

export class IssuerMetadataCredentialConfig {
    @IsString()
    format!: string;
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
}

@ApiExtraModels(
    AttestationBasedPolicy,
    NoneTrustPolicy,
    AllowListPolicy,
    RootOfTrustPolicy,
)
@Entity()
export class CredentialConfig {
    @IsString()
    @Column("varchar", { primary: true })
    id!: string;

    @IsString()
    @Column("varchar", { nullable: true })
    description?: string;

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
    claims?: Record<string, any>;

    /**
     * Webhook to receive claims for the issuance process.
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    @Column("json", { nullable: true })
    claimsWebhook?: WebhookConfig;

    /**
     * Webhook to receive claims for the issuance process.
     */
    @IsOptional()
    @ValidateNested()
    @Type(() => WebhookConfig)
    @Column("json", { nullable: true })
    notificationWebhook?: WebhookConfig;

    // has to be optional since there may be credentials that are disclosed without a frame
    @Column("json", { nullable: true })
    @IsOptional()
    @IsObject()
    disclosureFrame?: Record<string, any>;

    @IsOptional()
    @ValidateNested()
    @Type(() => VCT)
    @Column("json", { nullable: true })
    vct?: VCT;

    @IsOptional()
    @Column("boolean", { default: false })
    @IsBoolean()
    keyBinding?: boolean;

    @IsOptional()
    @IsString()
    certId?: string;

    @ManyToOne(() => CertEntity, { onDelete: "SET NULL" })
    cert!: CertEntity;

    @IsOptional()
    @Column("boolean", { default: false })
    @IsBoolean()
    statusManagement?: boolean;

    @IsOptional()
    @Column("int", { nullable: true })
    @IsNumber()
    lifeTime?: number;

    @IsOptional()
    @ValidateNested()
    @Type(() => SchemaResponse)
    @Column("json", { nullable: true })
    schema?: SchemaResponse;

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
    embeddedDisclosurePolicy?: EmbeddedDisclosurePolicy;
}
