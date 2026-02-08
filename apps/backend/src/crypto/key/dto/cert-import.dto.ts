import { OmitType } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { CertEntity } from "../entities/cert.entity";
import { CertUsage } from "../entities/cert-usage.entity";

/**
 * DTO for creating a certificate.
 */
export class CertImportDto extends OmitType(CertEntity, [
    "tenantId",
    "tenant",
    "key",
    "createdAt",
    "updatedAt",
    "usages",
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
     * Usage types for the certificate.
     */
    @IsEnum(CertUsage, { each: true })
    certUsageTypes: CertUsage[];

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
