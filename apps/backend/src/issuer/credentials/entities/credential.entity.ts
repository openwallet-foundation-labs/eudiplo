// --- credential-config.entity.ts ---

import {
    ApiExtraModels,
    ApiHideProperty,
    ApiProperty,
    getSchemaPath,
} from "@nestjs/swagger";
import { CredentialConfigurationSupported } from "@openid4vc/openid4vci";
import { Type } from "class-transformer";
import {
    IsBoolean,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { Column, Entity, ManyToMany, ManyToOne, OneToMany } from "typeorm";

import { CertEntity } from "../../../crypto/key/entities/cert.entity";
import { SchemaResponse } from "../../credentials-metadata/dto/schema-response.dto";
import { VCT } from "../../credentials-metadata/dto/vct.dto";
import { IssuanceConfig } from "../../issuance/entities/issuance-config.entity";
import {
    AllowListPolicy,
    AttestationBasedPolicy,
    EmbeddedDisclosurePolicy,
    NoneTrustPolicy,
    PolicyType,
    RootOfTrustPolicy,
} from "./policies.dto";

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

    @Column("json")
    @IsObject()
    config!: CredentialConfigurationSupported;

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
