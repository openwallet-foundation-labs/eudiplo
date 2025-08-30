import * as Joi from "joi";

/**
 * Module for managing user sessions.
 */

export const SESSION_VALIDATION_SCHEMA = Joi.object({
    SESSION_TIDY_UP_INTERVAL: Joi.number()
        .default(60 * 60)
        .description("Interval in seconds to run session tidy up")
        .meta({ group: "session", order: 10 }),
    SESSION_TTL: Joi.number()
        .default(24 * 60 * 60)
        .description("Time to live for sessions in seconds")
        .meta({ group: "session", order: 20 }),
});
