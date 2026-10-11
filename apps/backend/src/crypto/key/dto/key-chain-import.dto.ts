import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { JWK } from "jose";
import { createZodDto } from "nestjs-zod";
import {
    EcJwkSchema,
    KeyChainImportSchema,
    RotationPolicyImportSchema,
} from "../schemas/key-chain.schema.js";
import { KeyUsageType } from "../types/key-usage-type.js";
import { KeyChainType } from "./key-chain-create.dto.js";

/**
 * JWK structure for EC keys (P-256).
 */
class EcJwk extends createZodDto(EcJwkSchema) implements JWK {
    kty!: string;

    x!: string;

    y!: string;

    crv!: string;

    d!: string;

    alg?: string;

    kid?: string;
}

/**
 * Rotation policy for imported key chains.
 * Without `type`, enabling it makes the imported key the root CA key and a new
 * leaf key is generated for signing, unless the certificate is the
 * self-signed certificate of a standalone key chain.
 */
class RotationPolicyImportDto extends createZodDto(RotationPolicyImportSchema) {
    @ApiProperty({
        description:
            "Whether rotation is enabled. Without type, true makes the imported key a root CA signer, unless crt is a single self-signed certificate that is not a CA.",
        default: false,
    })
    enabled!: boolean;

    @ApiPropertyOptional({
        description: "Rotation interval in days.",
        example: 90,
        minimum: 1,
        maximum: 3650,
    })
    intervalDays?: number;

    @ApiPropertyOptional({
        description: "Certificate validity in days.",
        example: 365,
        minimum: 1,
        maximum: 3650,
    })
    certValidityDays?: number;
}

/**
 * DTO for importing a key chain from file configuration.
 *
 * This format supports importing keys with their certificates.
 * The import can be done in two ways:
 * 1. Combined: key + certificate in single JSON file
 * 2. Separate: key JSON references a certificate JSON via keyId matching
 */
export class KeyChainImportDto extends createZodDto(KeyChainImportSchema) {
    @ApiPropertyOptional({
        description:
            "ID for the key chain. If not provided, a new UUID will be generated.",
    })
    id?: string;

    @ApiPropertyOptional({
        description:
            "The private key in JWK format. Provide keyPem instead for PKCS#8 PEM input.",
    })
    key?: EcJwk;

    @ApiPropertyOptional({
        description:
            "PKCS#8 PEM-encoded EC private key. Provide key instead for JWK input.",
    })
    keyPem?: string;

    @ApiPropertyOptional({
        description: "Human-readable description.",
    })
    description?: string;

    @ApiProperty({
        description: "Usage type for this key chain.",
        enum: KeyUsageType,
    })
    usageType!: KeyUsageType;

    @ApiPropertyOptional({
        description:
            "Key chain type. standalone: key is the signing key and crt its chain, leaf first. internalChain: key is a CA key and the last crt entry its CA certificate (created if crt is omitted); a new signing key is generated with a certificate issued by it. Without type, key is a CA key only if rotationPolicy.enabled is true and crt is not a single self-signed certificate that is not a CA. The export writes it.",
        enum: KeyChainType,
    })
    type?: KeyChainType;

    @ApiPropertyOptional({
        description:
            "Certificate chain (leaf first). Each entry may be PEM or base64-encoded DER; values are normalized to PEM during import. For an internal chain (see type), the last certificate in the chain is treated as the root CA certificate.",
    })
    crt?: string[];

    @ApiPropertyOptional({
        description: "KMS provider to use. Defaults to 'db'.",
    })
    kmsProvider?: string;

    @ApiPropertyOptional({
        description:
            "Rotation policy. Without type, enabling it makes the imported key a root CA signer and a new leaf key is generated; if crt is provided, the selected root CA certificate must have CA=true and its public key must match the imported private key. Exception: if crt is a single self-signed certificate that is not a CA, as in the export of a standalone key chain, the imported key stays the signing key and is rotated like a standalone key chain. With rotation enabled, intervalDays defaults to 90 and certValidityDays to 365; without it, no intervals are stored.",
    })
    rotationPolicy?: RotationPolicyImportDto;
}
