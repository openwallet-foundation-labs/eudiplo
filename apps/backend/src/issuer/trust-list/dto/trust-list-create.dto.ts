import {
    ApiExtraModels,
    ApiProperty,
    getSchemaPath,
    OmitType,
} from "@nestjs/swagger";
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
    @ApiProperty({ enum: ["internal"] })
    @IsString()
    type: "internal";

    @IsString()
    issuerKeyChainId: string;

    @IsString()
    revocationKeyChainId: string;

    @ValidateNested()
    @Type(() => TrustListEntityInfo)
    info: TrustListEntityInfo;
}

/**
 * External trust list entity - uses PEM certificates directly
 */
export class ExternalTrustListEntity {
    @ApiProperty({ enum: ["external"] })
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
@ApiExtraModels(InternalTrustListEntity, ExternalTrustListEntity)
export class TrustListCreateDto extends OmitType(TrustList, [
    "tenant",
    "tenantId",
    "jwt",
    "keyChain",
    "keyChainId",
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
    description?: string;

    @IsString()
    @IsOptional()
    keyChainId?: string;

    @IsOptional()
    @ValidateNested({ each: true })
    @ApiProperty({
        type: "array",
        items: {
            oneOf: [
                { $ref: getSchemaPath(InternalTrustListEntity) },
                { $ref: getSchemaPath(ExternalTrustListEntity) },
            ],
            discriminator: {
                propertyName: "type",
                mapping: {
                    internal: getSchemaPath(InternalTrustListEntity),
                    external: getSchemaPath(ExternalTrustListEntity),
                },
            },
        },
    })
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
