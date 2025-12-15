import { PickType } from "@nestjs/swagger";
import { CertEntity } from "../entities/cert.entity";

/**
 * DTO for generating a self-signed certificate.
 */
export class CertSelfSignedDto extends PickType(CertEntity, [
    "keyId",
    "isAccessCert",
    "isSigningCert",
] as const) {}
