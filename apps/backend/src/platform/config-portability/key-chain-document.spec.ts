import * as x509 from "@peculiar/x509";
import { beforeAll, describe, expect, it } from "vitest";
import {
    internalChainProblems,
    isInternalChainWithPrivateKeys,
} from "./key-chain-document.js";

const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };

async function keyWithCertificate(name: string, ca: boolean) {
    const keys = (await crypto.subtle.generateKey(algorithm, true, [
        "sign",
        "verify",
    ])) as CryptoKeyPair;
    const certificate = await x509.X509CertificateGenerator.createSelfSigned(
        {
            serialNumber: "01",
            name: `CN=${name}`,
            notBefore: new Date(Date.now() - 60_000),
            notAfter: new Date(Date.now() + 3_600_000),
            keys,
            signingAlgorithm: algorithm,
            extensions: ca
                ? [new x509.BasicConstraintsExtension(true, undefined, true)]
                : [],
        },
        crypto,
    );
    const { kty, crv, x, y, d } = await crypto.subtle.exportKey(
        "jwk",
        keys.privateKey,
    );
    return { jwk: { kty, crv, x, y, d }, certificate };
}

describe("internal chain documents with private keys", () => {
    let root: Awaited<ReturnType<typeof keyWithCertificate>>;
    let active: Awaited<ReturnType<typeof keyWithCertificate>>;
    const spec = (overrides: Record<string, unknown> = {}) => ({
        id: "issuer",
        usageType: "attestation",
        kmsProvider: "db",
        keySource: {
            type: "private-jwk",
            jwk: root.jwk,
            activeJwk: active.jwk,
        },
        crt: [root.certificate.toString("pem")],
        // Stored internal chains keep the root after the leaf.
        activeCertificate: `${active.certificate.toString("pem")}\n${root.certificate.toString("pem")}`,
        ...overrides,
    });
    const problems = (overrides: Record<string, unknown>) =>
        internalChainProblems(spec(overrides)).map(({ code, path }) => ({
            code,
            path,
        }));

    beforeAll(async () => {
        root = await keyWithCertificate("Root CA", true);
        active = await keyWithCertificate("Signer", false);
    });

    it("applies only a private key with an active key without the importer", () => {
        expect(isInternalChainWithPrivateKeys(spec())).toBe(true);
        expect(
            isInternalChainWithPrivateKeys(
                spec({ keySource: { type: "private-jwk", jwk: root.jwk } }),
            ),
        ).toBe(false);
    });

    it("accepts matching key and certificate pairs", () => {
        expect(internalChainProblems(spec())).toEqual([]);
        expect(internalChainProblems(spec({ kmsProvider: undefined }))).toEqual(
            [],
        );
    });

    it("reports certificates of the other key", async () => {
        const swapped = await keyWithCertificate("Root CA", true);
        expect(
            problems({
                crt: [swapped.certificate.toString("pem")],
                activeCertificate: root.certificate.toString("pem"),
            }),
        ).toEqual([
            { code: "CERTIFICATE_KEY_MISMATCH", path: "/spec/crt/0" },
            {
                code: "CERTIFICATE_KEY_MISMATCH",
                path: "/spec/activeCertificate",
            },
        ]);
    });

    it("reports a root certificate that is no CA", () => {
        expect(problems({ crt: [active.certificate.toString("pem")] })).toEqual(
            [{ code: "ROOT_CERTIFICATE_NOT_CA", path: "/spec/crt/0" }],
        );
    });

    it("reports broken keys at the key and certificates that are not PEM", () => {
        expect(
            problems({
                keySource: {
                    type: "private-jwk",
                    jwk: { ...root.jwk, d: active.jwk.d },
                    activeJwk: active.jwk,
                },
                crt: [root.certificate.toString("base64")],
            }),
        ).toEqual([
            { code: "INVALID_PRIVATE_KEY", path: "/spec/keySource/jwk" },
            { code: "INVALID_CERTIFICATE", path: "/spec/crt/0" },
        ]);
    });

    it("requires the root certificate", () => {
        for (const crt of [undefined, []])
            expect(problems({ crt })).toEqual([
                { code: "ROOT_CERTIFICATE_REQUIRED", path: "/spec/crt" },
            ]);
    });

    it("reports what applying would reject or drop", () => {
        expect(
            problems({
                kmsProvider: "vault",
                crt: [
                    root.certificate.toString("pem"),
                    root.certificate.toString("pem"),
                ],
                activeCertificate: undefined,
            }),
        ).toEqual([
            { code: "INVALID_KMS_PROVIDER", path: "/spec/kmsProvider" },
            { code: "ROOT_CERTIFICATE_REQUIRED", path: "/spec/crt" },
            {
                code: "ACTIVE_CERTIFICATE_REQUIRED",
                path: "/spec/activeCertificate",
            },
        ]);
    });
});
