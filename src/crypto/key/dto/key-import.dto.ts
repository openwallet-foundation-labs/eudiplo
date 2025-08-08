import { Type } from 'class-transformer';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { JWK } from 'jose';

class Key implements JWK {
    @IsString()
    kid: string; // Key ID
    @IsEnum(['EC'])
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
    @IsObject()
    @Type(() => Key)
    privateKey: Key;

    /**
     * Optional certificate in PEM format.
     */
    @IsString()
    @IsOptional()
    crt?: string;
}
