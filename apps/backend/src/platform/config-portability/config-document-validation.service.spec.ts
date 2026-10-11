import { schemaUrl } from "@eudiplo/config-format/config-format.js";
import { afterEach, describe, expect, it } from "vitest";
import { ConfigDocumentValidationService } from "./config-document-validation.service.js";
import { ConfigMigrationService } from "./config-migration.service.js";
import { ConfigResourceRegistry } from "./config-resource.registry.js";

describe("ConfigDocumentValidationService", () => {
    const migrations = new ConfigMigrationService(new ConfigResourceRegistry());
    const skipTrustAuthority = { value: false };
    const service = new ConfigDocumentValidationService(migrations, {
        get: (key: string) =>
            key === "SKIP_TRUST_AUTHORITY"
                ? skipTrustAuthority.value
                : undefined,
    } as any);

    it("accepts an explicit key-regeneration decision", () => {
        expect(
            service.validate({
                $schema: schemaUrl("KeyChain"),
                kind: "KeyChain",
                metadata: {},
                spec: {
                    id: "issuer",
                    usageType: "attestation",
                    kmsProvider: "db",
                    keySource: {
                        type: "regenerate",
                        keyChainType: "internalChain",
                    },
                },
            }),
        ).toEqual([]);
    });

    it("accepts the null rotation values of earlier exports with a private key", () => {
        expect(
            service.validate({
                $schema: schemaUrl("KeyChain"),
                kind: "KeyChain",
                metadata: {},
                spec: {
                    id: "issuer",
                    usageType: "attestation",
                    keySource: {
                        type: "private-jwk",
                        jwk: {
                            kty: "EC",
                            crv: "P-256",
                            x: "x",
                            y: "y",
                            d: "d",
                        },
                    },
                    rotationPolicy: {
                        enabled: false,
                        intervalDays: null,
                        certValidityDays: null,
                    },
                },
            }),
        ).toEqual([]);
    });

    describe("key chains with private keys", () => {
        const jwk = { kty: "EC", crv: "P-256", x: "x", y: "y", d: "d" };
        const keyChain = (keySource: Record<string, unknown>) => ({
            $schema: schemaUrl("KeyChain"),
            kind: "KeyChain" as const,
            metadata: {},
            spec: {
                id: "issuer",
                usageType: "attestation",
                keySource: { type: "private-jwk", ...keySource },
                crt: ["root certificate"],
                activeCertificate: "active certificate",
            },
        });

        it("checks the keys and certificates of an internal chain instead of the importer schema", () => {
            expect(
                service
                    .validate(keyChain({ jwk, activeJwk: jwk }))
                    .map(({ code, path, resource }) => ({
                        code,
                        path,
                        resource,
                    })),
            ).toEqual([
                {
                    code: "INVALID_PRIVATE_KEY",
                    path: "/spec/keySource/jwk",
                    resource: { kind: "KeyChain", id: "issuer" },
                },
                {
                    code: "INVALID_PRIVATE_KEY",
                    path: "/spec/keySource/activeJwk",
                    resource: { kind: "KeyChain", id: "issuer" },
                },
                {
                    code: "INVALID_CERTIFICATE",
                    path: "/spec/crt/0",
                    resource: { kind: "KeyChain", id: "issuer" },
                },
                {
                    code: "INVALID_CERTIFICATE",
                    path: "/spec/activeCertificate",
                    resource: { kind: "KeyChain", id: "issuer" },
                },
            ]);
        });

        it("keeps the importer schema for a private key without activeJwk", () => {
            expect(service.validate(keyChain({ jwk }))).toEqual([
                expect.objectContaining({
                    code: "CURRENT_SCHEMA_VALIDATION_FAILED",
                    path: "/spec/",
                    message: expect.stringContaining("activeCertificate"),
                }),
            ]);
        });
    });

    it("accepts identity carried by the schema-described spec", () => {
        expect(
            service.validate({
                $schema: schemaUrl("Client"),
                kind: "Client",
                metadata: {},
                spec: {
                    clientId: "different",
                    roles: ["clients:manage"],
                },
            }),
        ).toEqual([]);
    });

    describe("presentation configs", () => {
        const presentation = (trusted_authorities?: unknown[]) => ({
            $schema: schemaUrl("PresentationConfig"),
            kind: "PresentationConfig" as const,
            metadata: {},
            spec: {
                id: "pid",
                dcql_query: {
                    credentials: [
                        {
                            id: "pid",
                            format: "dc+sd-jwt",
                            meta: { vct_values: ["urn:eudi:pid:1"] },
                            ...(trusted_authorities
                                ? { trusted_authorities }
                                : {}),
                        },
                    ],
                },
            },
        });

        afterEach(() => {
            skipTrustAuthority.value = false;
        });

        it("accepts credential queries with trusted_authorities", () => {
            expect(
                service.validate(
                    presentation([
                        {
                            type: "etsi_tl",
                            values: [{ trustListId: "pid-issuers" }],
                        },
                    ]),
                ),
            ).toEqual([]);
        });

        it("reports credential queries without trusted_authorities", () => {
            expect(service.validate(presentation())).toEqual([
                expect.objectContaining({
                    severity: "error",
                    code: "TRUSTED_AUTHORITY_REQUIRED",
                    path: "/spec/dcql_query/credentials",
                    message: expect.stringContaining(
                        "Credential queries without trusted_authorities: pid.",
                    ),
                    resource: { kind: "PresentationConfig", id: "pid" },
                }),
            ]);
        });

        it("accepts them with SKIP_TRUST_AUTHORITY", () => {
            skipTrustAuthority.value = true;
            expect(service.validate(presentation())).toEqual([]);
        });
    });
});
