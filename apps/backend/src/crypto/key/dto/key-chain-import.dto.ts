import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { JWK } from "jose";
import { KeyUsageType } from "../entities/key-chain.entity";

/**
 * JWK structure for EC keys (P-256).
 */
class EcJwk implements JWK {
    @IsString()
    kty!: string;

    @IsString()
    x!: string;

    @IsString()
    y!: string;

    @IsString()
    crv!: string;

    @IsString()
    d!: string;

    @IsString()
    @IsOptional()
    alg?: string;

    @IsString()
    @IsOptional()
    kid?: string;
}

/**
 * DTO for importing a key chain from file configuration.
 *
 * This format supports importing keys with their certificates.
 * The import can be done in two ways:
 * 1. Combined: key + certificate in single JSON file
 * 2. Separate: key JSON references a certificate JSON via keyId matching
 */
export class KeyChainImportDto {
    @ApiPropertyOptional({
        description:
            "ID for the key chain. If not provided, a new UUID will be generated.",
    })
    @IsString()
    @IsOptional()
    id?: string;

    @ApiProperty({
        description: "The private key in JWK format.",
    })
    @IsObject()
    @ValidateNested()
    @Type(() => EcJwk)
    key!: EcJwk;

    @ApiPropertyOptional({
        description: "Human-readable description.",
    })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiProperty({
        description: "Usage type for this key chain.",
        enum: KeyUsageType,
    })
    @IsEnum(KeyUsageType)
    usageType!: KeyUsageType;

    @ApiPropertyOptional({
        description:
            "Certificate chain in PEM format (leaf first, then intermediates/CA).",
    })
    @IsString({ each: true })
    @IsOptional()
    crt?: string[];

    @ApiPropertyOptional({
        description: "KMS provider to use. Defaults to 'db'.",
    })
    @IsString()
    @IsOptional()
    kmsProvider?: string;
}
