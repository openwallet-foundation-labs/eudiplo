import { webcrypto } from "node:crypto";
import * as x509 from "@peculiar/x509";
import { exportJWK } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import {
    certificateEntryToPem,
    isSelfSignedCertificate,
    pemCertificates,
} from "./pem-certificates.js";

const crypto = webcrypto as Crypto;
const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
const validity = {
    notBefore: new Date(Date.now() - 60_000),
    notAfter: new Date(Date.now() + 3_600_000),
};
const generateKeys = () =>
    crypto.subtle.generateKey(algorithm, true, [
        "sign",
        "verify",
    ]) as Promise<CryptoKeyPair>;

describe("PEM certificates", () => {
    let caKeys: CryptoKeyPair;
    let leafKeys: CryptoKeyPair;
    let ca: x509.X509Certificate;
    let leaf: x509.X509Certificate;
    let selfSignedLeaf: x509.X509Certificate;

    beforeAll(async () => {
        caKeys = await generateKeys();
        ca = await x509.X509CertificateGenerator.createSelfSigned(
            {
                serialNumber: "01",
                name: "CN=CA",
                ...validity,
                keys: caKeys,
                signingAlgorithm: algorithm,
                extensions: [
                    new x509.BasicConstraintsExtension(true, undefined, true),
                    new x509.KeyUsagesExtension(
                        x509.KeyUsageFlags.keyCertSign,
                        true,
                    ),
                ],
            },
            crypto,
        );
        leaf = await x509.X509CertificateGenerator.create(
            {
                serialNumber: "02",
                subject: "CN=Leaf",
                issuer: "CN=CA",
                ...validity,
                publicKey: (await generateKeys()).publicKey,
                signingKey: caKeys.privateKey,
                signingAlgorithm: algorithm,
            },
            crypto,
        );
        leafKeys = await generateKeys();
        // Like the certificate the importer generates for a key without crt.
        selfSignedLeaf = await x509.X509CertificateGenerator.createSelfSigned(
            {
                serialNumber: "03",
                name: "CN=Tenant",
                ...validity,
                keys: leafKeys,
                signingAlgorithm: algorithm,
                extensions: [
                    new x509.KeyUsagesExtension(
                        x509.KeyUsageFlags.digitalSignature,
                        true,
                    ),
                ],
            },
            crypto,
        );
    });

    it("keeps PEM as given and wraps base64 DER in 64-character PEM lines", () => {
        const pem = ca.toString("pem");
        expect(certificateEntryToPem(`  ${pem}\n`)).toBe(pem.trim());
        const fromDer = certificateEntryToPem(ca.toString("base64"));
        expect(fromDer).toBe(pem.replaceAll("\r\n", "\n").trim());
        expect(
            fromDer
                .split("\n")
                .slice(1, -1)
                .every((line) => line.length <= 64),
        ).toBe(true);
    });

    it("rejects entries that are neither PEM nor base64 DER", () => {
        expect(() => certificateEntryToPem("not a certificate")).toThrow(
            "not valid base64 DER",
        );
        expect(() => certificateEntryToPem("")).toThrow("empty");
    });

    it("splits a PEM chain into one block per certificate", () => {
        const chain = [leaf.toString("pem"), ca.toString("pem")];
        expect(pemCertificates(chain.join("\n"))).toEqual(
            chain.map((pem) => pem.replaceAll("\r\n", "\n").trim()),
        );
        expect(pemCertificates("no certificate")).toEqual([]);
    });

    it("recognizes certificates self-signed with a key, including leaves without keyCertSign", async () => {
        const caKey = await exportJWK(caKeys.privateKey);
        const leafKey = await exportJWK(leafKeys.privateKey);
        expect(isSelfSignedCertificate(ca.toString("pem"), caKey)).toBe(true);
        expect(
            isSelfSignedCertificate(selfSignedLeaf.toString("pem"), leafKey),
        ).toBe(true);
        expect(
            isSelfSignedCertificate(selfSignedLeaf.toString("pem"), caKey),
        ).toBe(false);
        expect(isSelfSignedCertificate(leaf.toString("pem"), caKey)).toBe(
            false,
        );
        expect(isSelfSignedCertificate("not a certificate", caKey)).toBe(false);
        // Names itself as issuer and holds the key, but another key signed it.
        const forged = await x509.X509CertificateGenerator.create(
            {
                serialNumber: "04",
                subject: "CN=Tenant",
                issuer: "CN=Tenant",
                ...validity,
                publicKey: leafKeys.publicKey,
                signingKey: caKeys.privateKey,
                signingAlgorithm: algorithm,
            },
            crypto,
        );
        expect(isSelfSignedCertificate(forged.toString("pem"), leafKey)).toBe(
            false,
        );
        // Holds the key and is signed with it, but names another issuer.
        const reissued = await x509.X509CertificateGenerator.create(
            {
                serialNumber: "05",
                subject: "CN=Tenant",
                issuer: "CN=Other",
                ...validity,
                publicKey: leafKeys.publicKey,
                signingKey: leafKeys.privateKey,
                signingAlgorithm: algorithm,
            },
            crypto,
        );
        expect(isSelfSignedCertificate(reissued.toString("pem"), leafKey)).toBe(
            false,
        );
    });
});
