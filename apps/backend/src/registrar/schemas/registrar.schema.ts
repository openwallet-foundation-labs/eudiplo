import { z } from "zod";

const RegistrationCertificateDefaultsSchema = z
    .record(z.string(), z.unknown())
    .nullable()
    .optional()
    .describe(
        "Optional default values used when generating registration certificates.",
    );

/**
 * The registrar client appends API paths to the registrar URL and the OAuth2
 * client appends OIDC paths to the OIDC URL, so both must be plain http(s)
 * base URLs: a query or fragment would swallow the appended path (for example
 * a trailing `#`), and credentials do not belong in a stored URL. This is a
 * refinement, so the published JSON schema stays unchanged.
 */
function isRegistrarBaseUrl(value: string): boolean {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return false;
    }
    return (
        (url.protocol === "https:" || url.protocol === "http:") &&
        url.username === "" &&
        url.password === "" &&
        // Checked on the raw value: an empty query or fragment ("?" or "#")
        // is not visible in URL.search or URL.hash.
        !value.includes("?") &&
        !value.includes("#")
    );
}

/**
 * Contact values the registrar stores for the relying party and puts in the
 * subject alternative names of its access certificates. The rules are the
 * registrar's own, so a value it would reject is refused when saved here.
 */
const RelyingPartyContactSchema = z
    .object({
        supportUri: z
            .url({ protocol: /^https$/ })
            .optional()
            .describe("https URL where the relying party can be contacted."),
        email: z
            .string()
            .regex(
                // No `i` flag: JSON Schema patterns cannot carry it.
                /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/,
                "Must be an email address",
            )
            .optional()
            .describe("Email address of the relying party."),
        phone: z
            .string()
            .regex(
                /^[+0-9()\-\s]{5,40}$/,
                "Must be 5 to 40 digits, spaces, +, -, ( or )",
            )
            .optional()
            .describe("Phone number of the relying party."),
    })
    .strict()
    .refine(
        (contact) =>
            contact.supportUri !== undefined ||
            contact.email !== undefined ||
            contact.phone !== undefined,
        "Set at least one of supportUri, email or phone",
    )
    .nullable()
    .optional()
    .describe(
        "Contact of the relying party, sent when EUDIPLO registers the relying party at the registrar. The registrar needs at least one contact value to issue access certificates. A relying party that is already registered keeps its contact.",
    );

const REGISTRAR_BASE_URL_MESSAGE =
    "Must be an http(s) URL without query, fragment or credentials";

export const CreateRegistrarConfigSchema = z
    .object({
        registrarUrl: z
            .url()
            .refine(isRegistrarBaseUrl, REGISTRAR_BASE_URL_MESSAGE)
            .describe("Base URL of the registrar service."),
        oidcUrl: z
            .url()
            .refine(isRegistrarBaseUrl, REGISTRAR_BASE_URL_MESSAGE)
            .describe("OIDC discovery or issuer URL used for authentication."),
        clientId: z
            .string()
            .min(1)
            .describe("OAuth client ID used against the registrar."),
        clientSecret: z
            .string()
            .min(1)
            .optional()
            .describe(
                "Optional OAuth client secret for registrar authentication.",
            ),
        username: z
            .string()
            .min(1)
            .describe("Username used for registrar authentication."),
        password: z
            .string()
            .min(1)
            .describe("Password used for registrar authentication."),
        registrationCertificateDefaults:
            RegistrationCertificateDefaultsSchema.describe(
                "Optional default registration certificate values.",
            ),
        relyingPartyContact: RelyingPartyContactSchema,
    })
    .describe("Payload for creating registrar integration settings.")
    .strict();

export const UpdateRegistrarConfigSchema = CreateRegistrarConfigSchema.partial()
    .describe("Payload for partially updating registrar integration settings.")
    .strict();

export const CreateAccessCertificateSchema = z
    .object({
        keyId: z
            .string()
            .min(1)
            .describe("Key chain id used to issue the access certificate."),
    })
    .describe("Payload for creating an access certificate.")
    .strict();

export const CreateAccessKeyChainSchema = z
    .object({
        description: z
            .string()
            .optional()
            .describe("Human-readable description for the new key chain."),
        kmsProvider: z
            .string()
            .optional()
            .describe(
                "KMS provider for the new key chain (defaults to the configured default provider).",
            ),
    })
    .describe(
        "Payload for creating an access key chain enrolled at the registrar.",
    )
    .strict();

export type CreateRegistrarConfig = z.infer<typeof CreateRegistrarConfigSchema>;
export type UpdateRegistrarConfig = z.infer<typeof UpdateRegistrarConfigSchema>;
export type CreateAccessCertificate = z.infer<
    typeof CreateAccessCertificateSchema
>;
export type CreateAccessKeyChain = z.infer<typeof CreateAccessKeyChainSchema>;
