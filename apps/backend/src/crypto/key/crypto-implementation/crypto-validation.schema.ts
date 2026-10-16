import Joi from "joi";

export const CRYPTO_VALIDATION_SCHEMA = Joi.object({
    CRYPTO_TOLERANCE: Joi.number()
        .default(5)
        .description("Clock tolerance in seconds for JWT verification")
        .meta({ group: "crypto", order: 20 }),
});
