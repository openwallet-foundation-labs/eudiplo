import * as Joi from "joi";

export const DB_VALIDATION_SCHEMA = Joi.object({
    DB_TYPE: Joi.string()
        .valid("sqlite", "postgres")
        .default("sqlite")
        .description("Database type")
        .meta({ group: "database", order: 10 }),
    DB_HOST: Joi.string()
        .when("DB_TYPE", {
            is: "sqlite",
            then: Joi.optional(),
            otherwise: Joi.required(),
        })
        .description("Database host")
        .meta({ group: "database", order: 15 }),
    DB_PORT: Joi.number()
        .when("DB_TYPE", {
            is: "sqlite",
            then: Joi.optional(),
            otherwise: Joi.required(),
        })
        .description("Database port")
        .meta({ group: "database", order: 20 }),
    DB_USERNAME: Joi.string()
        .when("DB_TYPE", {
            is: "sqlite",
            then: Joi.optional(),
            otherwise: Joi.required(),
        })
        .description("Database username")
        .meta({ group: "database", order: 30 }),
    DB_PASSWORD: Joi.string()
        .when("DB_TYPE", {
            is: "sqlite",
            then: Joi.optional(),
            otherwise: Joi.required(),
        })
        .description("Database password")
        .meta({ group: "database", order: 40 }),
    DB_DATABASE: Joi.string()
        .when("DB_TYPE", {
            is: "sqlite",
            then: Joi.optional(),
            otherwise: Joi.required(),
        })
        .description("Database name")
        .meta({ group: "database", order: 50 }),
    DB_SYNCHRONIZE: Joi.boolean()
        .default(true)
        .description(
            "Enable TypeORM schema synchronization. Set to false in production after initial setup and rely on migrations instead.",
        )
        .meta({ group: "database", order: 60 }),
    DB_MIGRATIONS_RUN: Joi.boolean()
        .default(true)
        .description("Run pending database migrations automatically on startup")
        .meta({ group: "database", order: 70 }),
});
