import { ES256 } from "@owf/crypto";
import * as x509 from "@peculiar/x509";
import { describe, expect, it, vi } from "vitest";
import { WalletAttestationService } from "./wallet-attestation.service.js";
import {
    MatchedTrustedEntity,
    X509ValidationService,
} from "./x509-validation.service.js";

describe("WalletAttestationService trust requirements", () => {
    function createService() {
        return Object.assign(
            Object.create(WalletAttestationService.prototype),
            {
                getIssuer: () => ({ verifyWalletAttestation: vi.fn() }),
                settings: { cryptoToleranceSeconds: 0 },
            },
        ) as WalletAttestationService;
    }

    it("allows an absent optional attestation", async () => {
        await expect(
            createService().verifyWalletAttestation(
                "tenant",
                undefined,
                "https://as.example",
                false,
                [],
            ),
        ).resolves.toBeUndefined();
    });

    it("rejects an absent required attestation", async () => {
        await expect(
            createService().verifyWalletAttestation(
                "tenant",
                undefined,
                "https://as.example",
                true,
                [],
            ),
        ).rejects.toThrow("required but not provided");
    });

    it.each([true, false])(
        "requires provider trust for a presented attestation (required=%s)",
        async (required) => {
            await expect(
                createService().verifyWalletAttestation(
                    "tenant",
                    {
                        clientAttestationJwt: "signed-attestation",
                        clientAttestationPopJwt: "signed-pop",
                    },
                    "https://as.example",
                    required,
                    [],
                ),
            ).rejects.toThrow("No wallet provider trust lists configured");
        },
    );
});

describe("WalletAttestationService status list signature", () => {
    const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
    const b64url = (input: string | ArrayBuffer) =>
        Buffer.from(
            typeof input === "string" ? input : new Uint8Array(input),
        ).toString("base64url");

    /** Status list JWT whose x5c holds a genuine certificate for the signing key. */
    async function signedStatusList() {
        const keys = (await crypto.subtle.generateKey(algorithm, true, [
            "sign",
            "verify",
        ])) as CryptoKeyPair;
        const cert = await x509.X509CertificateGenerator.createSelfSigned({
            serialNumber: "01",
            name: "CN=Status List Signer",
            notBefore: new Date(Date.now() - 60_000),
            notAfter: new Date(Date.now() + 3_600_000),
            keys,
            signingAlgorithm: algorithm,
        });
        const header = b64url(
            JSON.stringify({
                alg: "ES256",
                typ: "statuslist+jwt",
                x5c: [Buffer.from(cert.rawData).toString("base64")],
            }),
        );
        const payload = (lst: string) =>
            b64url(JSON.stringify({ status_list: { bits: 1, lst } }));
        const data = `${header}.${payload("AA")}`;
        const signature = b64url(
            await crypto.subtle.sign(
                algorithm,
                keys.privateKey,
                new TextEncoder().encode(data),
            ),
        );
        return {
            jwt: `${data}.${signature}`,
            forgedJwt: `${header}.${payload("AQ")}.${signature}`,
        };
    }

    function verifyStatusListSignature(
        jwt: string,
        cryptoImpl: unknown = ES256,
    ): Promise<boolean> {
        const service = Object.assign(
            Object.create(WalletAttestationService.prototype),
            {
                logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
                cryptoImplementationService: {
                    getCryptoFromJwk: () => cryptoImpl,
                },
            },
        );
        return service.verifyStatusListSignature(jwt, null, null);
    }

    it("accepts a correctly signed status list", async () => {
        const { jwt } = await signedStatusList();

        await expect(verifyStatusListSignature(jwt)).resolves.toBe(true);
    });

    it("rejects a forged payload signed for a genuine x5c", async () => {
        const { forgedJwt } = await signedStatusList();

        await expect(verifyStatusListSignature(forgedJwt)).resolves.toBe(false);
    });

    it("rejects the status list when the signature cannot be checked", async () => {
        const { jwt } = await signedStatusList();
        const throwingCrypto = {
            getVerifier: async () => async () => {
                throw new Error("unsupported key");
            },
        };

        await expect(
            verifyStatusListSignature(jwt, throwingCrypto),
        ).resolves.toBe(false);
    });
});

describe("WalletAttestationService status list signer without revocation certificate", () => {
    const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
    const b64url = (input: string | ArrayBuffer) =>
        Buffer.from(
            typeof input === "string" ? input : new Uint8Array(input),
        ).toString("base64url");
    const der = (cert: x509.X509Certificate) =>
        Buffer.from(cert.rawData).toString("base64");

    async function keys() {
        return (await crypto.subtle.generateKey(algorithm, true, [
            "sign",
            "verify",
        ])) as CryptoKeyPair;
    }

    async function ca(name: string) {
        const caKeys = await keys();
        const cert = await x509.X509CertificateGenerator.createSelfSigned({
            serialNumber: "01",
            name: `CN=${name}`,
            notBefore: new Date(Date.now() - 60_000),
            notAfter: new Date(Date.now() + 3_600_000),
            keys: caKeys,
            signingAlgorithm: algorithm,
            extensions: [new x509.BasicConstraintsExtension(true, 0, true)],
        });
        return { cert, keys: caKeys };
    }

    /** Status list JWT signed by a leaf certificate that `issuer` issued. */
    async function statusListUnder(issuer: Awaited<ReturnType<typeof ca>>) {
        const leafKeys = await keys();
        const leaf = await x509.X509CertificateGenerator.create({
            serialNumber: "02",
            subject: "CN=Status List Signer",
            issuer: issuer.cert.subject,
            notBefore: new Date(Date.now() - 60_000),
            notAfter: new Date(Date.now() + 3_600_000),
            publicKey: leafKeys.publicKey,
            signingKey: issuer.keys.privateKey,
            signingAlgorithm: algorithm,
        });
        const data = `${b64url(
            JSON.stringify({
                alg: "ES256",
                typ: "statuslist+jwt",
                x5c: [der(leaf)],
            }),
        )}.${b64url(JSON.stringify({ status_list: { bits: 1, lst: "AA" } }))}`;
        const signature = b64url(
            await crypto.subtle.sign(
                algorithm,
                leafKeys.privateKey,
                new TextEncoder().encode(data),
            ),
        );
        return `${data}.${signature}`;
    }

    /** Verify with the provider CA and `otherCa` both in the trust store. */
    async function verify(
        jwt: string,
        providerCa: x509.X509Certificate,
        otherCa: x509.X509Certificate,
    ) {
        const issuanceThumbprint = Buffer.from(
            await providerCa.getThumbprint("SHA-256"),
        ).toString("hex");
        const matchedEntity: MatchedTrustedEntity = {
            entity: { entityId: "provider", services: [] },
            issuanceCert: providerCa,
            issuanceThumbprint,
            issuanceIsCa: true,
            matchMode: "ca",
        };
        const service = Object.assign(
            Object.create(WalletAttestationService.prototype),
            {
                logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
                cryptoImplementationService: {
                    getCryptoFromJwk: () => ES256,
                },
                x509ValidationService: new X509ValidationService(),
            },
        );
        return service.verifyStatusListSignature(jwt, matchedEntity, {
            entities: [
                {
                    services: [
                        { certValue: der(providerCa) },
                        { certValue: der(otherCa) },
                    ],
                },
            ],
        });
    }

    it("accepts a status list chained to the provider's attestation CA", async () => {
        const providerCa = await ca("Provider CA");
        const otherCa = await ca("Other Provider CA");

        await expect(
            verify(
                await statusListUnder(providerCa),
                providerCa.cert,
                otherCa.cert,
            ),
        ).resolves.toBe(true);
    });

    it("rejects a status list chained to another CA in the trust store", async () => {
        const providerCa = await ca("Provider CA");
        const otherCa = await ca("Foreign CA");

        await expect(
            verify(
                await statusListUnder(otherCa),
                providerCa.cert,
                otherCa.cert,
            ),
        ).resolves.toBe(false);
    });
});
