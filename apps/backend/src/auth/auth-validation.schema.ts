import * as Joi from "joi";

export const DEFAULT_JWT_SECRET = "supersecret";
export const DEFAULT_AUTH_CLIENT_ID = "root";
export const DEFAULT_AUTH_CLIENT_SECRET = "root";

export const AUTH_VALIDATION_SCHEMA: Joi.ObjectSchema = Joi.object({
    OIDC: Joi.string()
        .description("Enable OIDC mode")
        .meta({ group: "auth", order: 10 }),

    OIDC_INTERNAL_ISSUER_URL: Joi.string()
        .uri()
        .when("OIDC", {
            is: Joi.exist(),
            then: Joi.string().default((config) => config.OIDC),
            otherwise: Joi.optional(),
        })
        .description("Internal issuer URL in OIDC mode")
        .meta({ group: "auth", order: 20 }),

    OIDC_CLIENT_ID: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().required(),
        otherwise: Joi.optional(),
    })
        .description("Client ID for OIDC")
        .meta({ group: "auth", order: 25 }),

    OIDC_CLIENT_SECRET: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().required(),
        otherwise: Joi.optional(),
    })
        .description("Client secret for OIDC")
        .meta({ group: "auth", order: 26 }),

    OIDC_SUB: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().default("tenant_id"),
        otherwise: Joi.optional(),
    })
        .description("Claim to use as subject")
        .meta({ group: "auth", order: 30 }),

    OIDC_ALGORITHM: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().valid("RS256", "PS256", "ES256").default("RS256"),
        otherwise: Joi.optional(),
    })
        .description("Expected JWT alg")
        .meta({ group: "auth", order: 40 }),

    JWT_SECRET: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().optional(),
        otherwise: Joi.string().min(32).default(DEFAULT_JWT_SECRET),
    })
        .description("Local JWT secret (when OIDC is off)")
        .meta({ group: "auth", order: 50 }),

    JWT_ISSUER: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().optional(),
        otherwise: Joi.string().default("eudiplo-service"),
    })
        .description("Local JWT issuer")
        .meta({ group: "auth", order: 60 }),

    JWT_EXPIRES_IN: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().optional(),
        otherwise: Joi.string().default("24h"),
    })
        .description("Local JWT expiration")
        .meta({ group: "auth", order: 70 }),

    AUTH_CLIENT_SECRET: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().optional(),
        otherwise: Joi.string().default(DEFAULT_AUTH_CLIENT_SECRET),
    })
        .description("Client secret (local auth)")
        .meta({ group: "auth", order: 80 }),

    AUTH_CLIENT_ID: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().optional(),
        otherwise: Joi.string().default(DEFAULT_AUTH_CLIENT_ID),
    })
        .description("Client ID (local auth)")
        .meta({ group: "auth", order: 90 }),
    AUTH_CLIENT_TENANT: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string().optional(),
        otherwise: Joi.string().default("root"),
    })
        .description("Tenant to which this client should be added")
        .meta({ group: "auth", order: 100 }),
    AUTH_CLIENT_ROLES: Joi.when("OIDC", {
        is: Joi.exist(),
        then: Joi.string(),
        otherwise: Joi.string().default("all"),
    })
        .description("Roles assigned to this client")
        .meta({ group: "auth", order: 110 }),
}).unknown(true);
