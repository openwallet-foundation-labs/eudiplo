import { OmitType } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { CertEntity } from "../entities/cert.entity";

/**
 * DTO for importing a certificate.
 */
export class CertImportDto extends OmitType(CertEntity, [
    "tenantId",
    "tenant",
    "key",
    "createdAt",
    "updatedAt",
] as const) {
    /**
     * Key ID of the certificate's private key.
     */
    @IsString()
    keyId: string;
}
