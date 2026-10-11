import { describe, expect, test } from "vitest";
import {
    AttestationLoS,
    SchemaMetaBindingType,
    SchemaMetaConfigSchema,
    SchemaMetaFrameworkType,
    SchemaUriEntrySchema,
    TrustAuthorityEntrySchema,
} from "../dto/schema-meta-config.schema.js";
import { CredentialConfigCreateSchema } from "./credential-config.schema.js";

const credentialConfig = {
    id: "pid",
    config: {
        format: "dc+sd-jwt",
        display: [],
    },
    fields: [],
};

describe("CredentialConfigCreateSchema active credential policy", () => {
    test("requires status management when the policy is enabled", () => {
        const result = CredentialConfigCreateSchema.safeParse({
            ...credentialConfig,
            statusManagement: false,
            activeCredentials: { enabled: true },
        });

        expect(result.success).toBe(false);
        expect(result.error?.issues).toEqual([
            expect.objectContaining({
                path: ["statusManagement"],
                message:
                    "statusManagement must be enabled when activeCredentials is enabled.",
            }),
        ]);
    });

    test("accepts the single-active-credential policy", () => {
        const result = CredentialConfigCreateSchema.safeParse({
            ...credentialConfig,
            statusManagement: true,
            activeCredentials: { enabled: true, tracking: "internal" },
        });

        expect(result.success).toBe(true);
    });

    test("rejects the unsupported maxActive option", () => {
        const result = CredentialConfigCreateSchema.safeParse({
            ...credentialConfig,
            statusManagement: true,
            activeCredentials: { enabled: true, maxActive: 2 },
        });

        expect(result.success).toBe(false);
    });

    test("allows an existing policy to be cleared", () => {
        const result = CredentialConfigCreateSchema.safeParse({
            ...credentialConfig,
            activeCredentials: null,
        });

        expect(result.success).toBe(true);
    });
});

describe("CredentialConfigCreateSchema schemaMeta", () => {
    const keys = (schema: { shape: object }) =>
        Object.keys(schema.shape).sort();
    const stored = CredentialConfigCreateSchema.shape.schemaMeta
        .unwrap()
        .unwrap();

    // Publishing schema metadata with a credentialConfigId stores the publish
    // config as schemaMeta, so the stored schema must accept everything the
    // publish request accepts.
    test("has the fields of the schema metadata publish request", () => {
        expect(keys(stored)).toEqual(keys(SchemaMetaConfigSchema));
        expect(keys(stored.shape.schemaURIs.unwrap().element)).toEqual(
            keys(SchemaUriEntrySchema),
        );
        expect(keys(stored.shape.trustedAuthorities.unwrap().element)).toEqual(
            keys(TrustAuthorityEntrySchema),
        );
    });

    test.each(Object.values(SchemaMetaFrameworkType))(
        "accepts a full publish config with frameworkType %s",
        (frameworkType) => {
            const config = {
                id: "https://schemas.example/pid",
                name: "PID",
                version: "1.0.0",
                rulebookURI: "https://rules.example/pid.md",
                attestationLoS: AttestationLoS.HIGH,
                bindingType: SchemaMetaBindingType.KEY,
                schemaURIs: [
                    {
                        credentialConfigId: "pid",
                        format: "dc+sd-jwt",
                        uri: "https://schemas.example/pid.json",
                        meta: { vct: "urn:example:pid" },
                    },
                ],
                trustedAuthorities: [
                    {
                        trustListId: "trust-list",
                        frameworkType,
                        value: "https://trust.example/list",
                        verificationMethod: { kty: "EC" },
                    },
                    { verificationMethod: '{"kty":"EC"}' },
                ],
            };
            expect(SchemaMetaConfigSchema.safeParse(config).success).toBe(true);

            expect(stored.safeParse(config).error?.issues).toBeUndefined();
        },
    );

    test.each([
        ["attestationLoS", Object.values(AttestationLoS)],
        ["bindingType", Object.values(SchemaMetaBindingType)],
    ] as const)("accepts every %s of the publish request", (field, values) => {
        for (const value of values) {
            const config = {
                version: "1.0.0",
                attestationLoS: AttestationLoS.HIGH,
                bindingType: SchemaMetaBindingType.KEY,
                [field]: value,
            };
            expect(SchemaMetaConfigSchema.safeParse(config).success).toBe(true);
            expect(stored.safeParse(config).error?.issues).toBeUndefined();
        }
    });
});
