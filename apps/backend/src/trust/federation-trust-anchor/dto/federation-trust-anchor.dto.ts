import { createZodDto } from "nestjs-zod";
import {
    CreateFederationTrustAnchorSchema,
    UpdateFederationTrustAnchorSchema,
} from "../schemas/federation-trust-anchor.schema.js";

export class CreateFederationTrustAnchorDto extends createZodDto(
    CreateFederationTrustAnchorSchema,
) {}

export class UpdateFederationTrustAnchorDto extends createZodDto(
    UpdateFederationTrustAnchorSchema,
) {}
