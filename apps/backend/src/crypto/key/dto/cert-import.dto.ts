import { OmitType } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";
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
    @IsUUID()
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
     * Certificate in PEM format, if not provided, a self-signed certificate will be generated.
     */
    @IsString()
    @IsOptional()
    crt?: string;
}
