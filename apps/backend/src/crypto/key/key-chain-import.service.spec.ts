import { webcrypto } from "node:crypto";
import * as x509 from "@peculiar/x509";
import { exportPKCS8, generateKeyPair } from "jose";
import { describe, expect, it, vi } from "vitest";
import { KeyChainImportService } from "./key-chain-import.service.js";

describe("key replacement preparation", () => {
    it.each(["db", "vault"])(
        "keeps the live %s row when replacement certificate preparation fails",
        async (type) => {
            const service = Object.create(
                KeyChainImportService.prototype,
            ) as any;
            service.keyChainRepository = {
                existsBy: vi.fn().mockResolvedValue(true),
                save: vi.fn(),
                delete: vi.fn(),
            };
            service.tenantRepository = {
                findOneByOrFail: async () => ({ name: "Tenant" }),
            };
            service.getHostname = () => "issuer.example";
            service.resolveCertificateChain = () => undefined;
            const adapter = {
                type,
                importKey: vi
                    .fn()
                    .mockResolvedValue({ ref: { publicJwk: {} } }),
            };
            service.kmsRegistry = { resolve: () => adapter };
            service.certBuilder = {
                createSelfSignedCert: vi
                    .fn()
                    .mockRejectedValue(
                        new Error("certificate preparation failed"),
                    ),
            };
            const dto = {
                id: "key",
                key: { kid: "original-key-id" },
                usageType: "attestation",
            };
            await expect(service.importKeyChain("tenant", dto)).rejects.toThrow(
                "certificate preparation failed",
            );
            const imported = adapter.importKey.mock.calls[0][0];
            if (type === "db") expect(imported.kid).toBe("original-key-id");
            else expect(imported.kid).toMatch(/^key-import-/);
            expect(dto.key.kid).toBe("original-key-id");
            expect(service.keyChainRepository.save).not.toHaveBeenCalled();
            expect(service.keyChainRepository.delete).not.toHaveBeenCalled();
        },
    );
});

describe("PEM private key imports", () => {
    it("converts a PKCS#8 EC private key to JWK", async () => {
        const service = Object.create(
            KeyChainImportService.prototype,
        ) as KeyChainImportService;
        const { privateKey } = await generateKeyPair("ES256", {
            extractable: true,
        });
        const keyPem = await exportPKCS8(privateKey);

        const key = await (service as any).resolvePrivateKey({ keyPem });

        expect(key).toMatchObject({
            kty: "EC",
            crv: "P-256",
        });
        expect(key.d).toBeTypeOf("string");
    });
});

describe("imports with rotation enabled", () => {
    const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
    const crypto = webcrypto as Crypto;

    /** A key with a certificate, self-signed unless an issuer key is given. */
    async function keyWithCertificate(options: {
        ca: boolean;
        issuer?: CryptoKeyPair;
        issuerName?: string;
    }) {
        const keys = (await crypto.subtle.generateKey(algorithm, true, [
            "sign",
            "verify",
        ])) as CryptoKeyPair;
        const certificate = await x509.X509CertificateGenerator.create(
            {
                serialNumber: "01",
                subject: "CN=Key chain",
                issuer: options.issuerName ?? "CN=Key chain",
                notBefore: new Date(Date.now() - 60_000),
                notAfter: new Date(Date.now() + 3_600_000),
                signingAlgorithm: algorithm,
                publicKey: keys.publicKey,
                signingKey: (options.issuer ?? keys).privateKey,
                extensions: [
                    new x509.BasicConstraintsExtension(
                        options.ca,
                        undefined,
                        true,
                    ),
                ],
            },
            crypto,
        );
        const { kty, crv, x, y, d } = await crypto.subtle.exportKey(
            "jwk",
            keys.privateKey,
        );
        return {
            key: { kty: kty!, crv: crv!, x: x!, y: y!, d: d! },
            pem: certificate.toString("pem"),
        };
    }

    function serviceFor() {
        const service = Object.create(KeyChainImportService.prototype) as any;
        service.logger = { log: vi.fn() };
        service.keyChainRepository = {
            existsBy: vi.fn().mockResolvedValue(false),
            save: vi.fn(),
        };
        service.tenantRepository = {
            findOneByOrFail: async () => ({ name: "Tenant" }),
        };
        service.getHostname = () => "issuer.example";
        service.kmsRegistry = {
            resolve: () => ({
                type: "db",
                providerId: "db",
                importKey: vi.fn(async ({ privateJwk }) => {
                    const { d, ...publicJwk } = privateJwk;
                    return { ref: { privateJwk, publicJwk } };
                }),
            }),
        };
        service.importKeyChainWithRotation = vi.fn().mockResolvedValue("key");
        return service;
    }

    it.each([
        [{ enabled: true, intervalDays: 30 }, 30],
        [{ enabled: true }, 90],
    ])(
        "keeps the key of a standalone key chain as its signing key (%o)",
        async (rotationPolicy, intervalDays) => {
            const service = serviceFor();
            const { key, pem } = await keyWithCertificate({ ca: false });

            await service.importKeyChain("tenant", {
                id: "key",
                key,
                usageType: "attestation",
                crt: [pem],
                rotationPolicy,
            });

            expect(service.importKeyChainWithRotation).not.toHaveBeenCalled();
            expect(service.keyChainRepository.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    activeJwk: expect.objectContaining({ d: key.d }),
                    activeCertificate: pem,
                    rootJwk: null,
                    rootCertificate: null,
                    rotationEnabled: true,
                    rotationIntervalDays: intervalDays,
                    certValidityDays: 365,
                }),
            );
        },
    );

    it.each([
        ["a CA certificate", { ca: true }],
        ["no certificate", undefined],
    ])("imports the key as a CA key with %s", async (_, certificate) => {
        const service = serviceFor();
        const { key, pem } = await keyWithCertificate({ ca: true });

        await service.importKeyChain("tenant", {
            id: "key",
            key,
            usageType: "attestation",
            crt: certificate ? [pem] : undefined,
            rotationPolicy: { enabled: true },
        });

        expect(service.importKeyChainWithRotation).toHaveBeenCalled();
        expect(service.keyChainRepository.save).not.toHaveBeenCalled();
    });

    it("rejects the self-signed certificate of another key", async () => {
        const service = serviceFor();
        const { key } = await keyWithCertificate({ ca: false });
        const other = await keyWithCertificate({ ca: false });

        await expect(
            service.importKeyChain("tenant", {
                id: "key",
                key,
                usageType: "attestation",
                crt: [other.pem],
                rotationPolicy: { enabled: true },
            }),
        ).rejects.toThrow(/does not match the provided private key/);
        expect(service.keyChainRepository.save).not.toHaveBeenCalled();
    });

    describe("certificates that are not a standalone one", () => {
        /** Runs the CA path, which rejects a certificate that is not a CA. */
        async function expectCaPathRejects(key: object, crt: string[]) {
            const service = serviceFor();
            delete service.importKeyChainWithRotation;

            await expect(
                service.importKeyChain("tenant", {
                    id: "key",
                    key,
                    usageType: "attestation",
                    crt,
                    rotationPolicy: { enabled: true },
                }),
            ).rejects.toThrow(/Invalid rotation root certificate/);
            expect(service.keyChainRepository.save).not.toHaveBeenCalled();
        }

        // The same name as the subject does not make a certificate self-signed.
        it.each(["CN=Issuer", "CN=Key chain"])(
            "a leaf certificate signed by another key (issuer %s)",
            async (issuerName) => {
                const issuer = (await crypto.subtle.generateKey(
                    algorithm,
                    true,
                    ["sign", "verify"],
                )) as CryptoKeyPair;
                const { key, pem } = await keyWithCertificate({
                    ca: false,
                    issuer,
                    issuerName,
                });

                await expectCaPathRejects(key, [pem]);
            },
        );

        it("a certificate that names another issuer", async () => {
            const { key, pem } = await keyWithCertificate({
                ca: false,
                issuerName: "CN=Issuer",
            });

            await expectCaPathRejects(key, [pem]);
        });

        it("a chain of two certificates", async () => {
            const { key, pem } = await keyWithCertificate({ ca: false });
            const other = await keyWithCertificate({ ca: false });

            await expectCaPathRejects(key, [pem, other.pem]);
        });

        it("a certificate that does not parse", async () => {
            const { key } = await keyWithCertificate({ ca: false });

            await expectCaPathRejects(key, [
                "-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----",
            ]);
        });
    });
});
