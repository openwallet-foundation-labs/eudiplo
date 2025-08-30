import * as Joi from "joi";

export const CRYPTO_VALIDATION_SCHEMA = Joi.object({
    CRYPTO_ALG: Joi.string()
        .valid("ES256")
        .default("ES256")
        .description("The signing algorithm to use")
        .meta({ group: "crypto", order: 10 }),
});
