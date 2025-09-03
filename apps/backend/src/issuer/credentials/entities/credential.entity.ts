// --- credential-config.entity.ts ---

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
import { Column, Entity, ManyToMany, ManyToOne } from "typeorm";
import { TenantEntity } from "../../../auth/tenant/entitites/tenant.entity";
import { CertEntity } from "../../../crypto/key/entities/cert.entity";
import { SchemaResponse } from "../../credentials-metadata/dto/schema-response.dto";
import { VCT } from "../../credentials-metadata/dto/vct.dto";
import { IssuanceConfig } from "../../issuance/entities/issuance-config.entity";
import {
    AllowListPolicy,
    AttestationBasedPolicy,
    EmbeddedDisclosurePolicy,
    NoneTrustPolicy,
    RootOfTrustPolicy,
} from "./policies.dto";

export class DisplayImage {
    @IsString()
    uri: string;
}
export class Display {
    @IsString()
    name: string;
    @IsString()
    description: string;
    @IsString()
    locale: string;
    @IsString()
    background_color?: string;
    @IsString()
    text_color?: string;
    @ValidateNested()
    @Type(() => DisplayImage)
    background_image?: DisplayImage;
    @ValidateNested()
    @Type(() => DisplayImage)
    logo?: DisplayImage;
}

export class IssuerMetadataCredentialConfig {
    @IsString()
    format: string;
    @ValidateNested()
    @Type(() => Display)
    display: Display[];
    @IsOptional()
    @IsString()
    scope?: string;
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
    tenant: TenantEntity;

    @Column("json")
    @ValidateNested()
    @Type(() => IssuerMetadataCredentialConfig)
    config!: IssuerMetadataCredentialConfig;

    @Column("json", { nullable: true })
    @IsOptional()
    @IsObject()
    claims?: Record<string, any>;

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
    keyId?: string;

    @ManyToOne(() => CertEntity)
    key!: CertEntity;

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

    @ManyToMany(
        () => IssuanceConfig,
        (issuance) => issuance.credentialConfigs,
        { cascade: ["remove"], onDelete: "CASCADE" },
    )
    issuanceConfigs!: IssuanceConfig[];
}
