import { PickType } from "@nestjs/swagger";
import { CertEntity } from "../entities/cert.entity";

/**
 * DTO for updating certificate metadata (description and usage types).
 */
export class CertUpdateDto extends PickType(CertEntity, [
    "isAccessCert",
    "isSigningCert",
    "description",
] as const) {}
