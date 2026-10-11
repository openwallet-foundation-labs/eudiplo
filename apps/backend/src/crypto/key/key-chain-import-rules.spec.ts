import { webcrypto } from "node:crypto";
import * as x509 from "@peculiar/x509";
import { describe, expect, it } from "vitest";
import {
    generatedCertificateCurrent,
    importedCertificates,
    importedPrivateKey,
    importsAsCaChain,
} from "./key-chain-import-rules.js";

const crypto = webcrypto as Crypto;
const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
const day = 24 * 60 * 60 * 1000;

async function certificate(
    daysAgo: number,
    daysLeft: number,
    host?: string,
    ca = false,
) {
    const keys = (await crypto.subtle.generateKey(algorithm, true, [
        "sign",
        "verify",
    ])) as CryptoKeyPair;
    return (
        await x509.X509CertificateGenerator.createSelfSigned(
            {
                serialNumber: "01",
                name: "CN=Tenant",
                notBefore: new Date(Date.now() - daysAgo * day),
                notAfter: new Date(Date.now() + daysLeft * day),
                keys,
                signingAlgorithm: algorithm,
                extensions: [
                    ...(host
                        ? [
                              new x509.SubjectAlternativeNameExtension([
                                  { type: "dns", value: host },
                              ]),
                          ]
                        : []),
                    ...(ca
                        ? [
                              new x509.BasicConstraintsExtension(
                                  true,
                                  undefined,
                                  true,
                              ),
                          ]
                        : []),
                ],
            },
            crypto,
        )
    ).toString("pem");
}

describe("key chain import rules", () => {
    it("fills in the kid and alg of a key that lacks them", () => {
        const key = { kty: "EC", crv: "P-256", x: "x", y: "y", d: "d" };
        expect(importedPrivateKey("chain", key)).toEqual({
            ...key,
            kid: "chain-active",
            alg: "ES256",
        });
        expect(
            importedPrivateKey("chain", { ...key, kid: "own", alg: "ES384" }),
        ).toMatchObject({ kid: "own", alg: "ES384" });
    });

    it("stores the whole chain without rotation and only the CA certificate with it", () => {
        expect(importedCertificates(["leaf", "ca"], false)).toEqual([
            "leaf",
            "ca",
        ]);
        expect(importedCertificates(["leaf", "ca"], true)).toEqual(["ca"]);
        expect(importedCertificates([], false)).toBeUndefined();
        expect(importedCertificates(undefined, true)).toBeUndefined();
    });

    it("builds a CA chain with rotation unless crt is one self-signed certificate that is not a CA", async () => {
        const leaf = await certificate(1, 364);
        const ca = await certificate(1, 364, undefined, true);
        expect(importsAsCaChain(false, [ca])).toBe(false);
        expect(importsAsCaChain(true, undefined)).toBe(true);
        expect(importsAsCaChain(true, [ca])).toBe(true);
        expect(importsAsCaChain(true, [leaf])).toBe(false);
        expect(importsAsCaChain(true, [leaf, ca])).toBe(true);
        // The CA path reports an unreadable certificate.
        expect(importsAsCaChain(true, ["garbage"])).toBe(true);
    });

    it("keeps a generated certificate while it names the host and is not due for renewal", async () => {
        const host = "issuer.example";
        // A fresh one, also a short-lived one.
        expect(
            generatedCertificateCurrent(await certificate(1, 364, host), host),
        ).toBe(true);
        expect(
            generatedCertificateCurrent(await certificate(2, 8, host), host),
        ).toBe(true);
        // Less than 90 days left, or less than half of a short validity.
        expect(
            generatedCertificateCurrent(await certificate(300, 60, host), host),
        ).toBe(false);
        expect(
            generatedCertificateCurrent(await certificate(6, 4, host), host),
        ).toBe(false);
        // Another host, no host or no certificate.
        expect(
            generatedCertificateCurrent(
                await certificate(1, 364, "old.example"),
                host,
            ),
        ).toBe(false);
        expect(
            generatedCertificateCurrent(await certificate(1, 364), host),
        ).toBe(false);
        // A CA certificate is not checked for the host.
        expect(
            generatedCertificateCurrent(
                await certificate(1, 364, "old.example"),
                undefined,
            ),
        ).toBe(true);
        expect(generatedCertificateCurrent("garbage", host)).toBe(false);
        expect(generatedCertificateCurrent(undefined, host)).toBe(false);
    });
});
