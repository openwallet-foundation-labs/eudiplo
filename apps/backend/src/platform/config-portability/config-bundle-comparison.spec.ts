import { webcrypto } from "node:crypto";
import { schemaUrl } from "@eudiplo/config-format/config-format.js";
import * as x509 from "@peculiar/x509";
import { hash } from "bcrypt";
import { exportJWK, type JWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
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
    result.configService = {
        get: () => false,
        getOrThrow: () => "https://tenant.example",
    };
    result.kmsRegistry = { list: () => ({ default: "db" }) };
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
    describe("key chains", () => {
        const publicJwk = { kty: "EC", crv: "P-256", x: "x", y: "y" };
        // Use the real stored-spec mapping instead of the stub.
        function storedKeyChain(overrides: Record<string, unknown> = {}) {
            const row = {
                id: "key",
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
                ...overrides,
            };
            const result = service({}) as any;
            delete result.currentSpec;
            result.repos = {
                keyChains: {
                    findOneBy: async () => row,
                    find: async () => [row],
                },
            };
            return result as ConfigBundleService;
        }
        const keyChain = (spec: Record<string, unknown>): ConfigDocument => ({
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
                ...spec,
            },
        });

        it("treats a stored null key chain description like an omitted one", async () => {
            expect(
                await storedKeyChain().compareDocument(
                    "tenant",
                    keyChain({ rotationPolicy: { enabled: false } }),
                ),
            ).toEqual({ unchanged: true, changes: [] });
        });
        it("plans an exported key chain without rotation values as unchanged", async () => {
            const result = storedKeyChain() as any;
            const none = { find: async () => [], findOneBy: async () => null };
            Object.assign(result.repos, {
                tenants: { findOneByOrFail: async () => ({ name: "Tenant" }) },
                clients: none,
                registrarConfigs: none,
                issuanceConfigs: none,
                credentialConfigs: none,
                presentationConfigs: none,
                attributeProviders: none,
                webhookEndpoints: none,
                trustLists: none,
                statusLists: none,
            });
            result.kmsTenantConfigService = { getTenantConfig: () => null };
            result.ownershipService = {
                get: async () => ({ generation: 1, ownership: "unmanaged" }),
            };

            const { documents } = await result.exportBundle("tenant");
            const exported = documents.find(
                (document: ConfigDocument) =>
                    document.$schema === schemaUrl("KeyChain"),
            );

            expect(exported.spec.rotationPolicy).toEqual({ enabled: false });
            expect(
                await result.compareDocument("tenant", {
                    ...exported,
                    kind: "KeyChain",
                }),
            ).toEqual({ unchanged: true, changes: [] });
        });
        it("treats null rotation values from earlier exports like omitted ones", async () => {
            expect(
                await storedKeyChain().compareDocument(
                    "tenant",
                    keyChain({
                        rotationPolicy: {
                            enabled: false,
                            intervalDays: null,
                            certValidityDays: null,
                        },
                    }),
                ),
            ).toEqual({ unchanged: true, changes: [] });
        });
        it("treats an omitted rotation policy as disabled rotation", async () => {
            const stored = storedKeyChain();
            expect(
                await stored.compareDocument("tenant", keyChain({})),
            ).toEqual({ unchanged: true, changes: [] });
            const rotating = storedKeyChain({
                rotationEnabled: true,
                rotationIntervalDays: 30,
            });
            expect(
                await rotating.compareDocument("tenant", keyChain({})),
            ).toEqual({
                unchanged: false,
                changes: [
                    {
                        path: "/spec/rotationPolicy/enabled",
                        before: true,
                        after: false,
                    },
                    {
                        path: "/spec/rotationPolicy/intervalDays",
                        before: 30,
                    },
                ],
            });
        });
        const jwk = { ...publicJwk, d: "private" };
        // Rotation changes the plan lists for a stored internal db chain.
        const plannedRotation = async (
            row: Record<string, unknown>,
            keySource: Record<string, unknown>,
            rotationPolicy: Record<string, unknown>,
        ) =>
            (
                await storedKeyChain({
                    kmsProvider: "db",
                    externalKeyId: null,
                    rootJwk: jwk,
                    rootCertificate: "root",
                    hasInternalCa: () => true,
                    ...row,
                }).compareDocument(
                    "tenant",
                    keyChain({
                        kmsProvider: "db",
                        keySource: { type: "private-jwk", jwk, ...keySource },
                        crt: ["root"],
                        rotationPolicy,
                    }),
                )
            ).changes.filter(({ path }) =>
                path.startsWith("/spec/rotationPolicy"),
            );

        it("plans the rotation values the importer stores for a private key without active key", async () => {
            // With rotation, the importer fills in its default interval.
            expect(
                await plannedRotation(
                    {
                        rotationEnabled: true,
                        rotationIntervalDays: 90,
                        certValidityDays: 30,
                    },
                    {},
                    { enabled: true, certValidityDays: 30 },
                ),
            ).toEqual([]);
            // Without rotation, it stores no intervals.
            expect(
                await plannedRotation(
                    {},
                    {},
                    { enabled: false, intervalDays: 30, certValidityDays: 30 },
                ),
            ).toEqual([]);
        });
        it("plans the rotation values of an internal chain with private keys as given", async () => {
            const activeKey = { activeJwk: jwk };
            // No import defaults with rotation enabled.
            expect(
                await plannedRotation({ rotationEnabled: true }, activeKey, {
                    enabled: true,
                }),
            ).toEqual([]);
            // Intervals are kept without rotation.
            expect(
                await plannedRotation(
                    { rotationIntervalDays: 30, certValidityDays: 60 },
                    activeKey,
                    { enabled: false, intervalDays: 30, certValidityDays: 60 },
                ),
            ).toEqual([]);
        });
        it("reports the removal of values a key chain document leaves out", async () => {
            const stored = storedKeyChain({
                description: "Signing key",
                rotationEnabled: true,
                rotationIntervalDays: 30,
                certValidityDays: 365,
            });
            expect(
                await stored.compareDocument(
                    "tenant",
                    keyChain({
                        rotationPolicy: { enabled: true, intervalDays: null },
                    }),
                ),
            ).toEqual({
                unchanged: false,
                changes: [
                    { path: "/spec/description", before: "Signing key" },
                    {
                        path: "/spec/rotationPolicy/certValidityDays",
                        before: 365,
                    },
                    {
                        path: "/spec/rotationPolicy/intervalDays",
                        before: 30,
                    },
                ],
            });
        });
        describe("private keys the key chain importer imports", () => {
            const crypto = webcrypto as Crypto;
            const algorithm = {
                name: "ECDSA",
                namedCurve: "P-256",
                hash: "SHA-256",
            };
            const validity = {
                notBefore: new Date(Date.now() - 60_000),
                notAfter: new Date(Date.now() + 3_600_000),
            };
            const generateKeys = () =>
                crypto.subtle.generateKey(algorithm, true, [
                    "sign",
                    "verify",
                ]) as Promise<CryptoKeyPair>;
            // Generated certificates name the host of PUBLIC_URL.
            const name = (host: string) => [
                new x509.SubjectAlternativeNameExtension([
                    { type: "dns", value: host },
                ]),
            ];
            const selfSigned = async (
                keys: CryptoKeyPair,
                ca = false,
                period = validity,
                host = "tenant.example",
            ) =>
                (
                    await x509.X509CertificateGenerator.createSelfSigned(
                        {
                            serialNumber: "01",
                            name: "CN=Tenant",
                            ...period,
                            keys,
                            signingAlgorithm: algorithm,
                            extensions: (ca
                                ? [
                                      new x509.BasicConstraintsExtension(
                                          true,
                                          undefined,
                                          true,
                                      ),
                                  ]
                                : []
                            ).concat(name(host)),
                        },
                        crypto,
                    )
                ).toString("pem");
            const issued = async (
                keys: CryptoKeyPair,
                ca: CryptoKeyPair,
                period = validity,
            ) =>
                (
                    await x509.X509CertificateGenerator.create(
                        {
                            serialNumber: "02",
                            subject: "CN=Leaf",
                            issuer: "CN=Tenant",
                            ...period,
                            publicKey: keys.publicKey,
                            signingKey: ca.privateKey,
                            signingAlgorithm: algorithm,
                            extensions: name("tenant.example"),
                        },
                        crypto,
                    )
                ).toString("pem");
            const der = (pem: string) =>
                new x509.X509Certificate(pem).toString("base64");
            // How the importer stores the key: with kid and alg.
            const stored = (jwk: JWK) => ({
                ...jwk,
                kid: "key-active",
                alg: "ES256",
            });

            let keys: CryptoKeyPair;
            let activeKeys: CryptoKeyPair;
            let key: JWK;
            let otherKey: JWK;
            let keyCertificate: string;
            let issuedCertificate: string;
            let caCertificate: string;
            let activeKey: JWK;
            let activeChain: string;
            beforeAll(async () => {
                keys = await generateKeys();
                const caKeys = await generateKeys();
                activeKeys = await generateKeys();
                key = await exportJWK(keys.privateKey);
                otherKey = await exportJWK(caKeys.privateKey);
                activeKey = await exportJWK(activeKeys.privateKey);
                keyCertificate = await selfSigned(keys, true);
                caCertificate = await selfSigned(caKeys, true);
                issuedCertificate = await issued(keys, caKeys);
                activeChain = `${await issued(activeKeys, keys)}\n${keyCertificate}`;
            });

            const document = (spec: Record<string, unknown> = {}) =>
                ({
                    $schema: schemaUrl("KeyChain"),
                    kind: "KeyChain",
                    metadata: {},
                    spec: {
                        id: "key",
                        usageType: "attestation",
                        keySource: { type: "private-jwk", jwk: key },
                        ...spec,
                    },
                }) as ConfigDocument;
            const standalone = (overrides: Record<string, unknown> = {}) =>
                storedKeyChain({
                    kmsProvider: "db",
                    externalKeyId: null,
                    activeJwk: stored(key),
                    activeCertificate: keyCertificate,
                    ...overrides,
                });
            const rotating = (overrides: Record<string, unknown> = {}) =>
                storedKeyChain({
                    kmsProvider: "db",
                    externalKeyId: null,
                    rootJwk: stored(key),
                    rootCertificate: keyCertificate,
                    activeJwk: activeKey,
                    activeCertificate: activeChain,
                    rotationEnabled: true,
                    rotationIntervalDays: 90,
                    certValidityDays: 365,
                    hasInternalCa: () => true,
                    ...overrides,
                });
            const paths = async (
                result: ConfigBundleService,
                spec: Record<string, unknown>,
                kmsDefaultProvider?: string,
            ) =>
                (
                    await result.compareDocument(
                        "tenant",
                        document(spec),
                        kmsDefaultProvider,
                    )
                ).changes.map(({ path }) => path);

            it("plans a key as unchanged with the kid, alg, provider and PEM certificates the importer stored", async () => {
                const result = standalone({
                    activeCertificate: `${issuedCertificate}\n${caCertificate}`,
                });
                expect(
                    await result.compareDocument(
                        "tenant",
                        document({
                            crt: [der(issuedCertificate), der(caCertificate)],
                        }),
                    ),
                ).toEqual({ unchanged: true, changes: [] });
            });
            it("accepts the generated self-signed certificate for a document without crt, not an issued one", async () => {
                expect(
                    await standalone().compareDocument("tenant", document()),
                ).toEqual({ unchanged: true, changes: [] });
                expect(
                    await standalone({
                        activeCertificate: issuedCertificate,
                    }).compareDocument("tenant", document()),
                ).toEqual({
                    unchanged: false,
                    changes: [
                        {
                            path: "/spec/crt/0",
                            before: issuedCertificate
                                .replaceAll("\r\n", "\n")
                                .trim(),
                        },
                    ],
                });
            });
            it("does not compare the active key and leaf certificate that rotation generates", async () => {
                const rotation = { rotationPolicy: { enabled: true } };
                expect(
                    await rotating().compareDocument(
                        "tenant",
                        document(rotation),
                    ),
                ).toEqual({ unchanged: true, changes: [] });
                // With crt, the importer keeps only the last entry as CA certificate.
                expect(
                    await rotating().compareDocument(
                        "tenant",
                        document({
                            ...rotation,
                            crt: [issuedCertificate, der(keyCertificate)],
                        }),
                    ),
                ).toEqual({ unchanged: true, changes: [] });
                expect(
                    await paths(rotating(), {
                        ...rotation,
                        crt: [caCertificate],
                    }),
                ).toEqual(["/spec/crt/0"]);
            });
            it("compares a standalone key that rotates with its own certificate", async () => {
                // With rotation, one self-signed certificate that is not a CA
                // keeps the key as the signing key of a standalone key chain.
                const leaf = await selfSigned(keys);
                const rotatingStandalone = standalone({
                    activeCertificate: leaf,
                    rotationEnabled: true,
                    rotationIntervalDays: 90,
                    certValidityDays: 365,
                });
                const rotation = { rotationPolicy: { enabled: true } };
                expect(
                    await rotatingStandalone.compareDocument(
                        "tenant",
                        document({ ...rotation, crt: [der(leaf)] }),
                    ),
                ).toEqual({ unchanged: true, changes: [] });
                // A CA certificate makes it a CA chain instead.
                expect(
                    await paths(rotatingStandalone, {
                        ...rotation,
                        crt: [keyCertificate],
                    }),
                ).toEqual(["/spec/crt/0", "/spec/keySource"]);
            });
            it("reports a different key, kid, provider or chain type", async () => {
                // The import also generates a certificate for the new key.
                expect(
                    await paths(standalone(), {
                        keySource: { type: "private-jwk", jwk: otherKey },
                    }),
                ).toEqual(["/spec/crt/0", "/spec/keySource"]);
                expect(
                    await paths(standalone(), {
                        keySource: {
                            type: "private-jwk",
                            jwk: { ...key, kid: "renamed" },
                        },
                    }),
                ).toEqual(["/spec/keySource"]);
                expect(
                    await paths(standalone(), { kmsProvider: "vault" }),
                ).toEqual(["/spec/kmsProvider"]);
                // The import of a document without provider uses the default.
                expect(await paths(standalone(), {}, "vault")).toEqual([
                    "/spec/kmsProvider",
                ]);
                // With rotation, a standalone key would become a CA key.
                expect(
                    await paths(
                        standalone({
                            rotationEnabled: true,
                            rotationIntervalDays: 90,
                            certValidityDays: 365,
                        }),
                        {
                            rotationPolicy: { enabled: true },
                            crt: [keyCertificate],
                        },
                    ),
                ).toEqual(["/spec/keySource"]);
                // Without rotation, the CA key would become a standalone key.
                expect(
                    await paths(rotating(), {
                        rotationPolicy: { enabled: false },
                    }),
                ).toEqual([
                    "/spec/activeCertificate",
                    "/spec/keySource",
                    "/spec/rotationPolicy/certValidityDays",
                    "/spec/rotationPolicy/enabled",
                    "/spec/rotationPolicy/intervalDays",
                ]);
            });
            it("compares a key held by an external KMS by its public key", async () => {
                const { d: _d, ...publicKey } = key;
                const external = storedKeyChain({
                    kmsProvider: "vault",
                    externalKeyId: "key-import-1",
                    activeJwk: { ...publicKey, kid: "vault-key" },
                    activeCertificate: keyCertificate,
                });
                expect(
                    await external.compareDocument(
                        "tenant",
                        document({ kmsProvider: "vault" }),
                    ),
                ).toEqual({ unchanged: true, changes: [] });
                expect(
                    await paths(external, {
                        kmsProvider: "vault",
                        keySource: { type: "private-jwk", jwk: otherKey },
                    }),
                ).toEqual(["/spec/crt/0", "/spec/keySource"]);
                // With rotation, the CA key is the root and the KMS holds the generated active key.
                const { d: _activeD, ...activePublicKey } = activeKey;
                const externalChain = storedKeyChain({
                    kmsProvider: "vault",
                    externalKeyId: "key-active-1",
                    rootExternalKeyId: "key-import-1",
                    rootJwk: { ...publicKey, kid: "vault-root" },
                    rootCertificate: keyCertificate,
                    activeJwk: { ...activePublicKey, kid: "vault-active" },
                    activeCertificate: activeChain,
                    rotationEnabled: true,
                    rotationIntervalDays: 90,
                    certValidityDays: 365,
                    hasInternalCa: () => true,
                });
                const rotation = {
                    kmsProvider: "vault",
                    rotationPolicy: { enabled: true },
                };
                expect(
                    await externalChain.compareDocument(
                        "tenant",
                        document(rotation),
                    ),
                ).toEqual({ unchanged: true, changes: [] });
                expect(
                    await paths(externalChain, {
                        ...rotation,
                        keySource: { type: "private-jwk", jwk: activeKey },
                    }),
                ).toEqual(["/spec/crt/0", "/spec/keySource"]);
            });
            it("renews a generated certificate close to its expiry", async () => {
                const day = 24 * 60 * 60 * 1000;
                const period = (daysAgo: number, daysLeft: number) => ({
                    notBefore: new Date(Date.now() - daysAgo * day),
                    notAfter: new Date(Date.now() + daysLeft * day),
                });
                const expiring = period(300, 60);
                // Less than 90 days left: the import generates a new one.
                expect(
                    await paths(
                        standalone({
                            activeCertificate: await selfSigned(
                                keys,
                                false,
                                expiring,
                            ),
                        }),
                        {},
                    ),
                ).toEqual(["/spec/crt/0"]);
                expect(
                    await standalone({
                        activeCertificate: await selfSigned(
                            keys,
                            false,
                            period(200, 160),
                        ),
                    }).compareDocument("tenant", document()),
                ).toEqual({ unchanged: true, changes: [] });
                // A short-lived certificate is due after half of its validity.
                expect(
                    await standalone({
                        activeCertificate: await selfSigned(
                            keys,
                            false,
                            period(2, 8),
                        ),
                    }).compareDocument("tenant", document()),
                ).toEqual({ unchanged: true, changes: [] });
                expect(
                    await paths(
                        standalone({
                            activeCertificate: await selfSigned(
                                keys,
                                false,
                                period(6, 4),
                            ),
                        }),
                        {},
                    ),
                ).toEqual(["/spec/crt/0"]);
                // With rotation, an expiring leaf gets a new active key.
                expect(
                    await paths(
                        rotating({
                            activeCertificate: `${await issued(activeKeys, keys, expiring)}\n${keyCertificate}`,
                        }),
                        { rotationPolicy: { enabled: true } },
                    ),
                ).toEqual(["/spec/activeCertificate", "/spec/keySource"]);
                // An expiring generated CA certificate is generated again.
                expect(
                    await paths(
                        rotating({
                            rootCertificate: await selfSigned(
                                keys,
                                true,
                                period(3600, 60),
                            ),
                        }),
                        { rotationPolicy: { enabled: true } },
                    ),
                ).toEqual(["/spec/crt/0"]);
                // So does a leaf the plan cannot read.
                expect(
                    await paths(rotating({ activeCertificate: "garbage" }), {
                        rotationPolicy: { enabled: true },
                    }),
                ).toEqual(["/spec/activeCertificate", "/spec/keySource"]);
            });
            it("renews a generated certificate that names another host than PUBLIC_URL", async () => {
                expect(
                    await paths(
                        standalone({
                            activeCertificate: await selfSigned(
                                keys,
                                false,
                                validity,
                                "old.example",
                            ),
                        }),
                        {},
                    ),
                ).toEqual(["/spec/crt/0"]);
                // A generated CA certificate stays the trust anchor.
                expect(
                    await rotating({
                        rootCertificate: await selfSigned(
                            keys,
                            true,
                            validity,
                            "old.example",
                        ),
                    }).compareDocument(
                        "tenant",
                        document({ rotationPolicy: { enabled: true } }),
                    ),
                ).toEqual({ unchanged: true, changes: [] });
            });
            it("lists a crt entry the import would reject as a change instead of failing the plan", async () => {
                expect(
                    await paths(standalone(), { crt: ["not a certificate"] }),
                ).toEqual(["/spec/crt/0"]);
            });
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
