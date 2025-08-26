import { Type } from "class-transformer";
import { IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { JWK } from "jose";

class Key implements JWK {
    @IsString()
    kid: string; // Key ID
    @IsEnum(["EC"])
    kty: string; // Key Type
    @IsString()
    x: string; // X coordinate for EC keys
    @IsString()
    y: string; // Y coordinate for EC keys
    @IsString()
    crv: string; // Curve name for EC keys
    @IsString()
    d: string; // Private key value for EC keys
    @IsString()
    alg: string; // Algorithm used with the key
}

/**
 * DTO for importing a key.
 */
export class KeyImportDto {
    /**
     * The private key in JWK format.
     */
    @ValidateNested()
    @Type(() => Key)
    privateKey: Key;

    /**
     * Optional certificate in PEM format.
     */
    @IsString()
    @IsOptional()
    crt?: string;

    /**
     * Description of the key.
     */
    @IsString()
    @IsOptional()
    description?: string;
}
