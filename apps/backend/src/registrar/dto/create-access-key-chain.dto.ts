import { ApiPropertyOptional } from "@nestjs/swagger";
import { createZodDto } from "nestjs-zod";
import { CreateAccessKeyChainSchema } from "../schemas/registrar.schema.js";

/**
 * DTO for creating an access key chain and enrolling it at the registrar.
 */
export class CreateAccessKeyChainDto extends createZodDto(
    CreateAccessKeyChainSchema,
) {
    @ApiPropertyOptional({
        description: "Human-readable description for the new key chain.",
        example: "Registrar access certificate",
    })
    description?: string;

    @ApiPropertyOptional({
        description:
            "KMS provider for the new key chain (defaults to the configured default provider).",
        example: "db",
    })
    kmsProvider?: string;
}
