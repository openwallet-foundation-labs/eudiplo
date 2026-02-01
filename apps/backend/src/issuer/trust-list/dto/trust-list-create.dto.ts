import { OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { TrustList } from "../entities/trust-list.entity";

/**
 * Entity information for certificates (metadata for TEInformation)
 */
export class TrustListEntityInfo {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    lang?: string;

    @IsString()
    @IsOptional()
    uri?: string;

    @IsString()
    @IsOptional()
    country?: string;

    @IsString()
    @IsOptional()
    locality?: string;

    @IsString()
    @IsOptional()
    postalCode?: string;

    @IsString()
    @IsOptional()
    streetAddress?: string;

    @IsString()
    @IsOptional()
    contactUri?: string;
}

/**
 * Internal trust list entity - references certificates already in the system
 */
export class InternalTrustListEntity {
    @IsString()
    type: "internal";

    @IsString()
    issuerCertId: string;

    @IsString()
    revocationCertId: string;

    @ValidateNested()
    @Type(() => TrustListEntityInfo)
    info: TrustListEntityInfo;
}

/**
 * External trust list entity - uses PEM certificates directly
 */
export class ExternalTrustListEntity {
    @IsString()
    type: "external";

    @IsString()
    issuerCertPem: string;

    @IsString()
    revocationCertPem: string;

    @ValidateNested()
    @Type(() => TrustListEntityInfo)
    info: TrustListEntityInfo;
}

export type TrustListEntity = InternalTrustListEntity | ExternalTrustListEntity;

/**
 * DTO for creating a new Trust List, omitting tenant-related and auto-generated fields.
 */
export class TrustListCreateDto extends OmitType(TrustList, [
    "tenant",
    "tenantId",
    "jwt",
    "cert",
    "certId",
    "sequenceNumber",
    "createdAt",
    "updatedAt",
    "entityConfig",
    "id",
] as const) {
    @IsString()
    @IsOptional()
    id?: string;

    @IsString()
    @IsOptional()
    certId?: string;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => Object, {
        discriminator: {
            property: "type",
            subTypes: [
                { value: InternalTrustListEntity, name: "internal" },
                { value: ExternalTrustListEntity, name: "external" },
            ],
        },
        keepDiscriminatorProperty: true,
    })
    entities: TrustListEntity[];
}
