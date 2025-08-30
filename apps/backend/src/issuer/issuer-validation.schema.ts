import * as Joi from "joi";

export const ISSUER_VALIDATION_SCHEMA = Joi.object({
    PUBLIC_URL: Joi.string()
        .default("http://localhost:3000")
        .description("The public URL of the issuer")
        .meta({ group: "general", order: 10 }),
});
