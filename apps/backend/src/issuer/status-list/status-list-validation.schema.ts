import * as Joi from "joi";

export const STATUS_LIST_VALIDATION_SCHEMA = Joi.object({
    STATUS_LENGTH: Joi.number()
        .default(10000)
        .description("The length of the status list")
        .meta({ group: "status", order: 10 }),
    STATUS_BITS: Joi.number()
        .valid(1, 2, 4, 8)
        .default(1)
        .description("The number of bits used per status entry")
        .meta({ group: "status", order: 20 }),
});
