import { z } from "zod";

/** Members that only private or symmetric keys have (RFC 7517, RFC 7518). */
const PRIVATE_KEY_MEMBERS = ["d", "p", "q", "dp", "dq", "qi", "oth", "k"];

/** Public members each key type needs (RFC 7518 Section 6, RFC 8037). */
const REQUIRED_PUBLIC_MEMBERS: Record<string, string[]> = {
    EC: ["crv", "x", "y"],
    RSA: ["n", "e"],
    OKP: ["crv", "x"],
};

/** Upper bound for one serialized key; an RSA 8192 key needs about 1.5 KB. */
const MAX_JWK_LENGTH = 8192;

const FederationJwkSchema = z
    .object({
        kty: z
            .enum(["EC", "RSA", "OKP"])
            .describe("Key type of the public federation key."),
        kid: z
            .string()
            .min(1)
            .max(256)
            .describe(
                "Key ID. Federation statements name their signing key with `kid`.",
            ),
    })
    .catchall(z.unknown())
    .superRefine((jwk, ctx) => {
        // Pinned keys are hashed and sent along with every resolution.
        if (JSON.stringify(jwk).length > MAX_JWK_LENGTH) {
            ctx.addIssue({
                code: "custom",
                message: `a key may have at most ${MAX_JWK_LENGTH} characters of JSON`,
            });
        }
        for (const member of PRIVATE_KEY_MEMBERS) {
            if (member in jwk) {
                ctx.addIssue({
                    code: "custom",
                    path: [member],
                    message: `'${member}' is a private key member: configure the public key only`,
                });
            }
        }
        for (const member of REQUIRED_PUBLIC_MEMBERS[jwk.kty] ?? []) {
            if (typeof jwk[member] !== "string" || jwk[member] === "") {
                ctx.addIssue({
                    code: "custom",
                    path: [member],
                    message: `${jwk.kty} keys need '${member}'`,
                });
            }
        }
    })
    .describe("Public federation key of the trust anchor as a JWK.");

const FederationJwksSchema = z
    .object({
        keys: z
            .array(FederationJwkSchema)
            .min(1)
            .max(20)
            .describe("The trust anchor's federation keys."),
    })
    .strict()
    .superRefine((jwks, ctx) => {
        const seen = new Set<string>();
        jwks.keys.forEach((key, index) => {
            if (seen.has(key.kid)) {
                ctx.addIssue({
                    code: "custom",
                    path: ["keys", index, "kid"],
                    message: `kid '${key.kid}' is used twice`,
                });
            }
            seen.add(key.kid);
        });
    })
    .describe(
        "JWK set with the federation keys of the trust anchor, obtained out of band (OpenID Federation 1.0 Section 10.2).",
    );

/**
 * An Entity Identifier: an `https` URL with a host and no query or fragment
 * (OpenID Federation 1.0 Section 1.2).
 */
const FederationEntityIdSchema = z
    .string()
    .min(1)
    .max(2048)
    .refine(
        (value) => {
            try {
                const url = new URL(value);
                return (
                    url.protocol === "https:" &&
                    url.hostname !== "" &&
                    url.search === "" &&
                    url.hash === "" &&
                    !value.includes("?") &&
                    !value.includes("#")
                );
            } catch {
                return false;
            }
        },
        {
            message:
                "must be an https URL with a host and without query or fragment",
        },
    );

export const CreateFederationTrustAnchorSchema = z
    .object({
        id: z
            .string()
            .min(1)
            .max(255)
            .regex(/^[A-Za-z0-9._-]+$/, {
                message: "may only contain letters, digits, '.', '_' and '-'",
            })
            .describe("Unique identifier of the trust anchor in the tenant."),
        entityId: FederationEntityIdSchema.describe(
            "Entity identifier of the trust anchor, exactly as configured in `federation.trustAnchors` and DCQL `openid_federation` values.",
        ),
        description: z
            .string()
            .min(1)
            .max(1000)
            .optional()
            .nullable()
            .describe("Optional description of the trust anchor."),
        jwks: FederationJwksSchema,
    })
    .describe(
        "An OpenID Federation trust anchor with its pinned federation keys.",
    )
    .strict();

export const UpdateFederationTrustAnchorSchema =
    CreateFederationTrustAnchorSchema.omit({ id: true })
        .partial()
        .describe("Payload for partially updating a federation trust anchor.")
        .strict();

export type CreateFederationTrustAnchor = z.infer<
    typeof CreateFederationTrustAnchorSchema
>;
export type UpdateFederationTrustAnchor = z.infer<
    typeof UpdateFederationTrustAnchorSchema
>;
export type FederationJwks = z.infer<typeof FederationJwksSchema>;
