import Joi from "joi";

export const CRYPTO_VALIDATION_SCHEMA = Joi.object({
    CRYPTO_ALG: Joi.string()
        .valid("ES256")
        .default("ES256")
        .description(
            "Deprecated, has no effect; only ES256 is accepted. Each key chain signs with the algorithm of its curve (ES256, ES384 or ES512), chosen when it is created; the algorithms a KMS provider offers are set in kms.json.",
        )
        .meta({ group: "crypto", order: 10 }),
    CRYPTO_TOLERANCE: Joi.number()
        .default(5)
        .description("Clock tolerance in seconds for JWT verification")
        .meta({ group: "crypto", order: 20 }),
});
