import * as Joi from "joi";

/**
 * Validation schema for the registrar module.
 * Defines the required environment variables and their types.
 */

export const REGISTRAR_VALIDATION_SCHEMA = Joi.object({
    REGISTRAR_URL: Joi.string()
        .description("The URL of the registrar")
        .meta({ group: "registrar", order: 10 }),
    REGISTRAR_OIDC_URL: Joi.string()
        .when("REGISTRAR_URL", {
            is: Joi.exist(),
            then: Joi.required(),
        })
        .description("The OIDC URL of the registrar")
        .meta({ group: "registrar", order: 20 }),
    REGISTRAR_OIDC_CLIENT_ID: Joi.string()
        .when("REGISTRAR_URL", {
            is: Joi.exist(),
            then: Joi.required(),
        })
        .description("The OIDC client ID of the registrar")
        .meta({ group: "registrar", order: 30 }),
    REGISTRAR_OIDC_CLIENT_SECRET: Joi.string()
        .when("REGISTRAR_URL", {
            is: Joi.exist(),
            then: Joi.required(),
        })
        .description("The OIDC client secret of the registrar")
        .meta({ group: "registrar", order: 40 }),
});
