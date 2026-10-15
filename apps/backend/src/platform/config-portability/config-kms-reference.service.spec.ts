import { exportJWK, generateKeyPair } from "jose";
import { describe, expect, it, vi } from "vitest";
import type { KmsProviderRegistry } from "../../crypto/key/kms/kms-provider.registry.js";
import { ConfigKmsReferenceService } from "./config-kms-reference.service.js";

describe("ConfigKmsReferenceService", () => {
    it("proves that the referenced KMS key matches the supplied public JWK", async () => {
        const pair = await generateKeyPair("ES256", { extractable: true });
        const publicJwk = await exportJWK(pair.publicKey);
        const sign = vi.fn(
            async (_ref, challenge: Uint8Array) =>
                new Uint8Array(
                    await globalThis.crypto.subtle.sign(
                        { name: "ECDSA", hash: "SHA-256" },
                        pair.privateKey,
                        challenge,
                    ),
                ),
        );
        const registry = {
            resolve: vi.fn(() => ({ sign })),
        } as unknown as KmsProviderRegistry;

        await new ConfigKmsReferenceService(registry).verify("tenant-a", {
            provider: "vault",
            externalKeyId: "issuer-key",
            publicJwk,
        });

        expect(registry.resolve).toHaveBeenCalledWith("vault", "tenant-a");
        expect(sign).toHaveBeenCalledWith(
            expect.objectContaining({
                externalKeyId: "issuer-key",
                publicJwk,
                alg: "ES256",
            }),
            expect.any(Uint8Array),
        );
    });

    it("rejects an accessible KMS key when its public JWK is different", async () => {
        const signingPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const otherPair = await generateKeyPair("ES256", {
            extractable: true,
        });
        const registry = {
            resolve: () => ({
                sign: async (_ref: unknown, challenge: Uint8Array) =>
                    new Uint8Array(
                        await globalThis.crypto.subtle.sign(
                            { name: "ECDSA", hash: "SHA-256" },
                            signingPair.privateKey,
                            challenge,
                        ),
                    ),
            }),
        } as unknown as KmsProviderRegistry;

        await expect(
            new ConfigKmsReferenceService(registry).verify("tenant-a", {
                provider: "vault",
                externalKeyId: "issuer-key",
                publicJwk: await exportJWK(otherPair.publicKey),
            }),
        ).rejects.toThrow("does not match its public JWK");
    });

    describe("unsupportedAlgorithm", () => {
        const p256 = { kty: "EC", crv: "P-256", x: "x", y: "y" };
        const p384 = { kty: "EC", crv: "P-384", x: "x", y: "y" };
        function service(supportedAlgs: string[]) {
            const registry = {
                resolve: vi.fn((provider?: string) => ({
                    providerId: provider ?? "default",
                    capabilities: { supportedAlgs },
                })),
            };
            return {
                registry,
                service: new ConfigKmsReferenceService(
                    registry as unknown as KmsProviderRegistry,
                ),
            };
        }

        it("checks an internal chain's keys against the database provider", () => {
            const { registry, service: references } = service(["ES256"]);

            expect(
                references.unsupportedAlgorithm("tenant-a", {
                    keySource: {
                        type: "private-jwk",
                        jwk: p256,
                        activeJwk: p384,
                    },
                }),
            ).toEqual({
                path: "/spec/keySource/activeJwk",
                message:
                    "KMS provider 'db' does not offer ES384 for the key in keySource.activeJwk. Supported: ES256",
            });
            expect(registry.resolve).toHaveBeenCalledWith("db", "tenant-a");
        });

        it("checks an imported private key against the tenant's default provider when none is named", () => {
            const { registry, service: references } = service(["ES256"]);

            expect(
                references.unsupportedAlgorithm("tenant-a", {
                    keySource: { type: "private-jwk", jwk: p384 },
                }),
            ).toMatchObject({ path: "/spec/keySource/jwk" });
            expect(registry.resolve).toHaveBeenCalledWith(
                undefined,
                "tenant-a",
            );
        });

        it("checks both keys of an external reference against its provider", () => {
            const { registry, service: references } = service(["ES256"]);

            expect(
                references.unsupportedAlgorithm("tenant-a", {
                    keySource: {
                        type: "external-reference",
                        provider: "hsm",
                        externalKeyId: "root",
                        publicJwk: p256,
                        activeExternalKeyId: "active",
                        activePublicJwk: p384,
                    },
                }),
            ).toMatchObject({
                path: "/spec/keySource/activePublicJwk",
                message: expect.stringContaining("KMS provider 'hsm'"),
            });
            expect(registry.resolve).toHaveBeenCalledWith("hsm", "tenant-a");
        });

        it("accepts keys whose algorithm the provider offers", () => {
            const { service: references } = service(["ES256", "ES384"]);

            expect(
                references.unsupportedAlgorithm("tenant-a", {
                    keySource: {
                        type: "private-jwk",
                        jwk: p256,
                        activeJwk: p384,
                    },
                }),
            ).toBeUndefined();
        });

        it("leaves unknown providers, invalid keys and regenerated keys to other checks", () => {
            const { service: references } = service(["ES256"]);
            const unknown = new ConfigKmsReferenceService({
                resolve: () => {
                    throw new Error("Unknown KMS provider");
                },
            } as unknown as KmsProviderRegistry);

            expect(
                unknown.unsupportedAlgorithm("tenant-a", {
                    keySource: { type: "private-jwk", jwk: p384 },
                }),
            ).toBeUndefined();
            expect(
                references.unsupportedAlgorithm("tenant-a", {
                    keySource: { type: "private-jwk", jwk: { kty: "OKP" } },
                }),
            ).toBeUndefined();
            expect(
                references.unsupportedAlgorithm("tenant-a", {
                    keySource: { type: "regenerate" },
                }),
            ).toBeUndefined();
        });
    });
});
