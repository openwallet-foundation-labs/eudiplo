import * as Joi from "joi";

/**
 * Validation schema for logging configuration
 */
export const LOG_VALIDATION_SCHEMA = Joi.object({
    LOG_LEVEL: Joi.string()
        .valid("trace", "debug", "info", "warn", "error", "fatal")
        .default(process.env.NODE_ENV === "production" ? "warn" : "debug")
        .description("Application log level")
        .meta({ group: "log", order: 10 }),
    LOG_ENABLE_HTTP_LOGGER: Joi.boolean()
        .default(false)
        .description("Enable HTTP request logging")
        .meta({ group: "log", order: 20 }),
    LOG_ENABLE_SESSION_LOGGER: Joi.boolean()
        .default(false)
        .description("Enable session flow logging")
        .meta({ group: "log", order: 30 }),
    LOG_DEBUG_MODE: Joi.boolean()
        .default(false)
        .description("Enable verbose debug logs")
        .meta({ group: "log", order: 40 }),
    LOG_FORMAT: Joi.string()
        .valid("json", "pretty")
        .default(process.env.NODE_ENV === "production" ? "json" : "pretty")
        .description("Log output format")
        .meta({ group: "log", order: 50 }),
    LOG_TO_FILE: Joi.boolean()
        .default(false)
        .description("Enable logging to file in addition to console")
        .meta({ group: "log", order: 60 }),
    LOG_FILE_PATH: Joi.string()
        .default("./logs/session.log")
        .description("File path for log output when LOG_TO_FILE is enabled")
        .meta({ group: "log", order: 70 }),
});
