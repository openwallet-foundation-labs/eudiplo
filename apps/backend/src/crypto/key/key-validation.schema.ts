import * as Joi from "joi";

export const KEY_VALIDATION_SCHEMA = Joi.object({
    KM_TYPE: Joi.string()
        .valid("db", "vault")
        .default("db")
        .description("The key management type")
        .meta({ group: "key", order: 10 }),

    // Vault-related config
    VAULT_URL: Joi.string()
        .uri()
        .when("KM_TYPE", {
            is: "vault",
            then: Joi.required(),
            otherwise: Joi.optional(),
        })
        .description("The URL of the Vault server")
        .meta({ group: "key", order: 20 }),
    VAULT_TOKEN: Joi.string()
        .when("KM_TYPE", {
            is: "vault",
            then: Joi.required(),
            otherwise: Joi.optional(),
        })
        .description("The token for accessing the Vault")
        .meta({ group: "key", order: 30 }),
});
