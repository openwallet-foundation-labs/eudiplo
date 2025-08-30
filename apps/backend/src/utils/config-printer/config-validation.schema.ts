import * as Joi from "joi";

/**
 * Validation schema for configuration
 */
export const CONFIG_VALIDATION_SCHEMA = Joi.object({
    CONFIG_PRINT: Joi.boolean()
        .default(false)
        .description("Enable config printing")
        .meta({ group: "config", order: 0 }),

    CONFIG_PRINT_FORMAT: Joi.string()
        .valid("text", "json", "markdown")
        .default("text")
        .description("Format for printing config")
        .meta({ group: "config", order: 1 }),

    CONFIG_PRINT_ADVANCED: Joi.boolean()
        .default(true)
        .description("Enable advanced config printing")
        .meta({ group: "config", order: 2 }),

    CONFIG_PRINT_IN_PROD: Joi.boolean()
        .default(false)
        .description("Allow config printing in production environments")
        .meta({ group: "config", order: 3 }),

    CONFIG_PRINT_FILE: Joi.string()
        .default("../../docs/architecture/environment-config.md")
        .description("Output file path for the documentation")
        .meta({ group: "config", order: 5 }),

    CONFIG_IMPORT: Joi.boolean()
        .default(false)
        .description("Run one-off config import on startup")
        .meta({ group: "config", order: 10 }),

    CONFIG_IMPORT_FORCE: Joi.boolean()
        .default(false)
        .description("Force overwrite on config import")
        .meta({ group: "config", order: 20 }),

    CONFIG_FOLDER: Joi.string()
        .default("../../assets/config")
        .description("Path to config import folder")
        .meta({ group: "config", order: 30 }),
});
