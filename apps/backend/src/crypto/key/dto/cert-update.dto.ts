import { PickType } from "@nestjs/swagger";
import { CertEntity } from "../entities/cert.entity";

/**
 * DTO for updating certificate metadata (description only).
 * Note: Usage types are now configured at the key level, not certificate level.
 */
export class CertUpdateDto extends PickType(CertEntity, [
    "description",
] as const) {}
