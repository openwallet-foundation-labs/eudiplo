// --- credential-config.entity.ts ---

import { ApiHideProperty } from "@nestjs/swagger";
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
import { Column, Entity, ManyToOne, OneToMany } from "typeorm";

import { CertEntity } from "../../../crypto/key/entities/cert.entity";
import { VCT } from "../../credentials-metadata/dto/credential-config.dto";
import { SchemaResponse } from "../../credentials-metadata/dto/schema-response.dto";
import { CredentialIssuanceBinding } from "../../issuance/entities/credential-issuance-binding.entity";

import {
    AllowListPolicy,
    AnyPolicy,
    AttestationBasedPolicy,
    EmbeddedDisclosurePolicy,
    NoneTrustPolicy,
    PolicyType,
    RootOfTrustPolicy,
} from "./policies";

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
    @Type(() => EmbeddedDisclosurePolicy, {
        discriminator: {
            property: "policy",
            subTypes: [
                { name: PolicyType.NONE, value: NoneTrustPolicy },
                { name: PolicyType.ALLOW_LIST, value: AllowListPolicy },
                { name: PolicyType.ROOT_OF_TRUST, value: RootOfTrustPolicy },
                {
                    name: PolicyType.ATTESTATION_BASED,
                    value: AttestationBasedPolicy,
                },
            ],
        },
        keepDiscriminatorProperty: true, // keep `policy` on the instance
    })
    @Column("json", { nullable: true })
    embeddedDisclosurePolicy?: AnyPolicy;

    @OneToMany(
        () => CredentialIssuanceBinding,
        (binding) => binding.credentialConfig,
        { cascade: ["remove"], onDelete: "CASCADE" },
    )
    credentialIssuanceBindings!: CredentialIssuanceBinding[];
}
