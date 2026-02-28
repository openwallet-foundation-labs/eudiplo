import { ApiPropertyOptional, OmitType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from "class-validator";
import { JWK } from "jose";
import { KeyEntity } from "../entities/keys.entity";

class Key implements JWK {
    @IsEnum(["EC"])
    kty!: string; // Key Type
    @IsString()
    x!: string; // X coordinate for EC keys
    @IsString()
    y!: string; // Y coordinate for EC keys
    @IsString()
    crv!: string; // Curve name for EC keys
    @IsString()
    d!: string; // Private key value for EC keys
    @IsString()
    alg!: string; // Algorithm used with the key
}

/**
 * DTO for importing a key.
 */
export class KeyImportDto extends OmitType(KeyEntity, [
    "tenantId",
    "tenant",
    "certificates",
    "createdAt",
    "updatedAt",
    "usage",
    "kmsProvider",
] as const) {
    /**
     * The private key in JWK format.
     */
    @IsObject()
    @ValidateNested()
    @Type(() => Key)
    key!: Key;

    /**
     * Optional KMS provider name to use for this key.
     * If not specified, the default KMS provider will be used.
     */
    @ApiPropertyOptional({
        description:
            "KMS provider name to use for this key. Defaults to the configured default.",
        example: "db",
    })
    @IsString()
    @IsOptional()
    kmsProvider?: string;
}
