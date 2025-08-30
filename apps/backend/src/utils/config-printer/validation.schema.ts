// config/validation.schema.ts
import * as Joi from "joi";

/**
 * Validation schema for base configuration
 */
export const BASE_VALIDATION_SCHEMA = Joi.object({
    FOLDER: Joi.string()
        .default("../../tmp")
        .description("Root working folder for temp files")
        .meta({ group: "general", order: 10 }),
    RP_NAME: Joi.string()
        .default("EUDIPLO")
        .description("Relying Party display name")
        .meta({ group: "general", order: 20 }),
}).unknown(true);
