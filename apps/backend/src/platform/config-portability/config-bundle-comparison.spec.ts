import { schemaUrl } from "@eudiplo/config-format/config-format.js";
import { hash } from "bcrypt";
import { describe, expect, it } from "vitest";
import { ConfigBundleService } from "./config-bundle.service.js";
import { ConfigDocumentValidationService } from "./config-document-validation.service.js";
import { ConfigResourceRegistry } from "./config-resource.registry.js";
import type { ConfigDocument } from "./config-resource.types.js";

function service(
    current: Record<string, unknown>,
    files: { id: string; filename: string }[] = [],
) {
    const result = Object.create(ConfigBundleService.prototype) as any;
    result.currentSpec = async () => structuredClone(current);
    result.files = { find: async () => files };
    result.registry = new ConfigResourceRegistry();
    result.documentValidationService = Object.create(
        ConfigDocumentValidationService.prototype,
    );
    result.configService = { get: () => false };
    return result as ConfigBundleService;
}
const client: ConfigDocument = {
    $schema: schemaUrl("Client"),
    kind: "Client",
    metadata: {},
    spec: {
        clientId: "client",
        roles: ["clients:manage"],
        secret: "test-secret",
    },
};
describe("configuration comparisons", () => {
    it("compares plaintext client input with its stored hash without revealing either", async () => {
        const current = {
            ...client.spec,
            secret: await hash("test-secret", 4),
        };
        const result = service(current);
        expect(await result.compareDocument("tenant", client)).toEqual({
            unchanged: true,
            changes: [],
        });
        const changed = await result.compareDocument("tenant", {
            ...client,
            spec: { ...client.spec, secret: "changed-secret" },
        });
        expect(changed.unchanged).toBe(false);
        expect(changed.changes).toEqual([
            {
                path: "/spec/secret",
                before: "[redacted]",
                after: "[redacted]",
                redacted: true,
            },
        ]);
    });
    it("compares stored storage URLs with the bundle filenames they serve", async () => {
        const document: ConfigDocument = {
            $schema: schemaUrl("IssuanceConfig"),
            kind: "IssuanceConfig",
            metadata: {},
            spec: {
                display: [{ name: "Issuer", logo: { uri: "company.png" } }],
            },
        };
        const stored = (uri: string) => ({
            display: [{ name: "Issuer", logo: { uri } }],
        });
        const files = [{ id: "569e", filename: "company.png" }];
        expect(
            await service(
                stored("http://localhost:3000/storage/569e"),
                files,
            ).compareDocument("tenant", document),
        ).toEqual({ unchanged: true, changes: [] });
        expect(
            (
                await service(
                    stored("http://localhost:3000/storage/other"),
                    files,
                ).compareDocument("tenant", document)
            ).unchanged,
        ).toBe(false);
    });
    it("preserves omitted update fields while detecting role changes", async () => {
        const result = service({ ...client.spec, description: "Retained" });
        expect((await result.compareDocument("tenant", client)).unchanged).toBe(
            true,
        );
        const changed = await result.compareDocument("tenant", {
            ...client,
            spec: { ...client.spec, roles: ["presentation:request"] },
        });
        expect(changed.unchanged).toBe(false);
        expect(changed.changes).toContainEqual({
            path: "/spec/roles/0",
            before: "clients:manage",
            after: "presentation:request",
        });
    });
    it("does not suppress explicit regeneration", async () => {
        const document: ConfigDocument = {
            $schema: schemaUrl("KeyChain"),
            kind: "KeyChain",
            metadata: {},
            spec: { id: "key", keySource: { type: "regenerate" } },
        };
        expect(
            (await service(document.spec).compareDocument("tenant", document))
                .unchanged,
        ).toBe(false);
    });
    it("treats a stored null key chain description like an omitted one", async () => {
        const publicJwk = { kty: "EC", crv: "P-256", x: "x", y: "y" };
        const result = service({}) as any;
        // Use the real stored-spec mapping instead of the stub.
        delete result.currentSpec;
        result.repos = {
            keyChains: {
                findOneBy: async () => ({
                    description: null,
                    usageType: "attestation",
                    kmsProvider: "vault",
                    externalKeyId: "vault-key",
                    activeJwk: { ...publicJwk, d: "private" },
                    activeCertificate: "cert",
                    rotationEnabled: false,
                    rotationIntervalDays: null,
                    certValidityDays: null,
                    hasInternalCa: () => false,
                }),
            },
        };
        const document: ConfigDocument = {
            $schema: schemaUrl("KeyChain"),
            kind: "KeyChain",
            metadata: {},
            spec: {
                id: "key",
                usageType: "attestation",
                kmsProvider: "vault",
                keySource: {
                    type: "external-reference",
                    provider: "vault",
                    externalKeyId: "vault-key",
                    publicJwk,
                },
                crt: ["cert"],
                rotationPolicy: { enabled: false },
            },
        };
        expect(await result.compareDocument("tenant", document)).toEqual({
            unchanged: true,
            changes: [],
        });
    });
    it("reports a description added to a trust list without one as new", async () => {
        const entities = [
            {
                type: "internal",
                issuerKeyChainId: "issuer",
                revocationKeyChainId: "issuer",
                info: { name: "Issuer" },
            },
        ];
        const result = service({}) as any;
        // Use the real stored-spec mapping instead of the stub.
        delete result.currentSpec;
        result.repos = {
            trustLists: {
                findOneBy: async () => ({
                    description: null,
                    keyChainId: "signer",
                    entityConfig: entities,
                }),
            },
        };
        const document: ConfigDocument = {
            $schema: schemaUrl("TrustList"),
            kind: "TrustList",
            metadata: {},
            spec: {
                id: "list",
                description: "Signer list",
                keyChainId: "signer",
                entities,
            },
        };
        expect(await result.compareDocument("tenant", document)).toEqual({
            unchanged: false,
            changes: [{ path: "/spec/description", after: "Signer list" }],
        });
    });
    it("detects removal of fields in KMS configs that replace the entire file", async () => {
        const document: ConfigDocument = {
            $schema: schemaUrl("KmsConfig"),
            kind: "KmsConfig",
            metadata: {},
            spec: {},
        };
        expect(
            (
                await service({ vaultToken: "removed-secret" }).compareDocument(
                    "tenant",
                    document,
                )
            ).unchanged,
        ).toBe(false);
    });
    it("reports registrar fields that the replacement removes", async () => {
        const document: ConfigDocument = {
            $schema: schemaUrl("RegistrarConfig"),
            kind: "RegistrarConfig",
            metadata: {},
            spec: {
                registrarUrl: "https://registrar.example/api",
                oidcUrl: "https://auth.example/realms/registrar",
                clientId: "client",
                username: "user",
                password: "password",
            },
        };

        expect(
            await service({ ...document.spec }).compareDocument(
                "tenant",
                document,
            ),
        ).toEqual({ unchanged: true, changes: [] });
        const changed = await service({
            ...document.spec,
            clientSecret: "stored-secret",
            registrationCertificateDefaults: {
                privacy_policy: "https://rp.example/privacy",
            },
        }).compareDocument("tenant", document);
        expect(changed.unchanged).toBe(false);
        expect(changed.changes).toEqual([
            {
                path: "/spec/clientSecret",
                before: "[redacted]",
                after: undefined,
                redacted: true,
            },
            {
                path: "/spec/registrationCertificateDefaults/privacy_policy",
                before: "https://rp.example/privacy",
                after: undefined,
            },
        ]);
    });
    it("treats registrar defaults set to null like omitted defaults", async () => {
        const document: ConfigDocument = {
            $schema: schemaUrl("RegistrarConfig"),
            kind: "RegistrarConfig",
            metadata: {},
            spec: {
                registrarUrl: "https://registrar.example/api",
                oidcUrl: "https://auth.example/realms/registrar",
                clientId: "client",
                username: "user",
                password: "password",
                registrationCertificateDefaults: null,
            },
        };
        const { registrationCertificateDefaults, ...stored } = document.spec;

        expect(
            await service(stored).compareDocument("tenant", document),
        ).toEqual({ unchanged: true, changes: [] });
    });
});
