import { PickType } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { CertEntity } from "../entities/cert.entity";
import { CertUsage } from "../entities/cert-usage.entity";

/**
 * DTO for updating certificate metadata (description and usage types).
 */
export class CertUpdateDto extends PickType(CertEntity, [
    "usages",
    "description",
] as const) {
    /**
     * Usage types for the certificate.
     */
    @IsEnum(CertUsage, { each: true })
    certUsageTypes: CertUsage[];
}
