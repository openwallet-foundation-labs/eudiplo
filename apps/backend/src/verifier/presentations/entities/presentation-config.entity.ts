import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsArray,
    IsBoolean,
    IsIn,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Validate,
    ValidateNested,
} from "class-validator";
import { Column, CreateDateColumn, Entity, UpdateDateColumn } from "typeorm";
import { WebhookConfig } from "../../../utils/webhook/webhook.dto";
import { RegistrationCertificateRequest } from "../dto/vp-request.dto";

/**
 * Attached attestations
 */
export class PresentationAttachment {
    @IsString()
    format: string;

    @IsNotEmpty()
    data: any;

    @IsNotEmpty()
    @IsString({ each: true })
    credential_ids?: string[];
}
// TODO: extend: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-trusted-authorities-query
export class TrustedAuthorityQuery {
    @IsString()
    @IsIn(["aki", "etsi_tl", "openid_federation"])
    type: string;

    @IsArray()
    @IsString({ each: true })
    values: string[];
}

//TODO: extend: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-credential-query

export class CredentialQuery {
    @IsString()
    id: string;

    @IsString()
    format: string;

    @IsOptional()
    @IsBoolean()
    multiple?: boolean;

    @IsObject()
    meta: any;

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => TrustedAuthorityQuery)
    trusted_authorities: TrustedAuthorityQuery[];
}

//TODO: extend: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#claims_query
export class ClaimsQuery {
    @IsString()
    id: string;

    @IsArray()
    path: string[];

    @IsArray()
    @IsOptional()
    values?: any[];
}

//TODO: extend: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html#name-credential-set-query
export class CredentialSetQuery {
    @ApiProperty({
        type: "array",
        items: { type: "array", items: { type: "string" } },
    })
    @IsArray()
    options: string[][];

    @IsBoolean()
    @IsOptional()
    required?: boolean;
}

export class DCQL {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CredentialQuery)
    credentials: CredentialQuery[];

    @IsArray()
    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CredentialSetQuery)
    credential_set?: CredentialSetQuery[];
}

/**
 * Entity representing a configuration for a Verifiable Presentation (VP) request.
 */
@Entity()
export class PresentationConfig {
    /**
     * Unique identifier for the VP request.
     */
    @Column("varchar", { primary: true })
    @IsString()
    id: string;

    /**
     * The tenant ID for which the VP request is made.
     */
    @ApiHideProperty()
    @Column("varchar", { primary: true })
    tenantId: string;

    /**
     * Description of the presentation configuration.
     */
    @Column("varchar", { nullable: true })
    @IsOptional()
    @IsString()
    description?: string;

    /**
     * Lifetime how long the presentation request is valid after creation, in seconds.
     */
    @IsNumber()
    @IsOptional()
    @Column("int", { default: 300 })
    lifeTime?: number;

    /**
     * The DCQL query to be used for the VP request.
     */
    @Column("json")
    @ValidateNested()
    @Type(() => DCQL)
    dcql_query: DCQL;
    /**
     * The registration certificate request containing the necessary details.
     */
    @IsOptional()
    @IsObject()
    @Column("json", { nullable: true })
    registrationCert?: RegistrationCertificateRequest;
    /**
     * Optional webhook URL to receive the response.
     */
    @Column("json", { nullable: true })
    @IsOptional()
    @IsObject()
    @Validate(WebhookConfig)
    @Type(() => WebhookConfig)
    webhook?: WebhookConfig;

    /**
     * The timestamp when the VP request was created.
     */
    @CreateDateColumn()
    createdAt: Date;

    /**
     * The timestamp when the VP request was last updated.
     */
    @UpdateDateColumn()
    updatedAt: Date;

    /**
     * Attestation that should be attached
     */
    @IsOptional()
    @IsArray()
    @ValidateNested()
    @Type(() => PresentationAttachment)
    @Column("json", { nullable: true })
    attached?: PresentationAttachment[];
}
