import { OmitType } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { CertEntity } from "../entities/cert.entity";

/**
 * DTO for creating/importing a certificate.
 * Note: Usage types are now configured at the key level, not certificate level.
 */
export class CertImportDto extends OmitType(CertEntity, [
    "tenantId",
    "tenant",
    "key",
    "createdAt",
    "updatedAt",
    "crt",
    "id",
] as const) {
    @IsOptional()
    @IsString()
    id?: string;

    /**
     * Key ID of the certificate's private key.
     */
    @IsString()
    keyId: string;

    /**
     * Certificate chain in PEM format (leaf first, then intermediates/CA).
     * If not provided, a self-signed certificate will be generated.
     */
    @IsString({ each: true })
    @IsOptional()
    crt?: string[];

    /**
     * Subject name (CN) for self-signed certificate generation.
     * If not provided, the tenant name will be used.
     */
    @IsString()
    @IsOptional()
    subjectName?: string;
}
