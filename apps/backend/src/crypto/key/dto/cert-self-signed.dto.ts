import { PickType } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { CertEntity } from "../entities/cert.entity";
import { CertUsage } from "../entities/cert-usage.entity";

/**
 * DTO for generating a self-signed certificate.
 */
export class CertSelfSignedDto extends PickType(CertEntity, [
    "keyId",
] as const) {
    /**
     * Usage types for the certificate.
     */
    @IsEnum(CertUsage, { each: true })
    certUsageTypes: CertUsage[];
}
