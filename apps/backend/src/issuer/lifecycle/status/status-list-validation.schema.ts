import * as Joi from "joi";

export const STATUS_LIST_VALIDATION_SCHEMA = Joi.object({
    STATUS_LENGTH: Joi.number()
        .default(10000)
        .description(
            "The default length of the status list. Can be overridden per tenant.",
        )
        .meta({ group: "status", order: 10 }),
    STATUS_BITS: Joi.number()
        .valid(1, 2, 4, 8)
        .default(1)
        .description(
            "The default number of bits used per status entry. Can be overridden per tenant.",
        )
        .meta({ group: "status", order: 20 }),
    STATUS_TTL: Joi.number()
        .min(60)
        .default(3600)
        .description(
            "The default TTL in seconds for status list JWTs. Verifiers can cache the JWT until expiration. Can be overridden per tenant.",
        )
        .meta({ group: "status", order: 30 }),
    STATUS_IMMEDIATE_UPDATE: Joi.boolean()
        .default(false)
        .description(
            "If true, regenerate status list JWT immediately on every status change. If false (default), use lazy regeneration when TTL expires. Can be overridden per tenant.",
        )
        .meta({ group: "status", order: 40 }),
});
