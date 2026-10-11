import { webcrypto } from "node:crypto";
import * as x509 from "@peculiar/x509";
import { beforeAll, describe, expect, it } from "vitest";
import { importedKeyChainType } from "./key-chain-import-type.js";

const algorithm = { name: "ECDSA", namedCurve: "P-256", hash: "SHA-256" };
const crypto = webcrypto as Crypto;

async function selfSignedCertificate(ca: boolean) {
    const keys = (await crypto.subtle.generateKey(algorithm, true, [
        "sign",
        "verify",
    ])) as CryptoKeyPair;
    return x509.X509CertificateGenerator.createSelfSigned(
        {
            serialNumber: "01",
            name: "CN=Key chain",
            notBefore: new Date(Date.now() - 60_000),
            notAfter: new Date(Date.now() + 3_600_000),
            signingAlgorithm: algorithm,
            keys,
            extensions: [
                new x509.BasicConstraintsExtension(ca, undefined, true),
            ],
        },
        crypto,
    );
}

describe("importedKeyChainType", () => {
    const rotating = { enabled: true };
    let standalone: x509.X509Certificate;
    let ca: x509.X509Certificate;

    beforeAll(async () => {
        standalone = await selfSignedCertificate(false);
        ca = await selfSignedCertificate(true);
    });

    it.each(["standalone", "internalChain"] as const)(
        "follows type %s over rotation and certificate",
        (type) => {
            for (const crt of [[ca.toString("pem")], [standalone.toString()]])
                for (const rotationPolicy of [rotating, { enabled: false }])
                    expect(
                        importedKeyChainType({ type, crt, rotationPolicy }),
                    ).toBe(type);
        },
    );

    it("makes the key a signing key without type and rotation", () => {
        expect(importedKeyChainType({ crt: [ca.toString("pem")] })).toBe(
            "standalone",
        );
        expect(importedKeyChainType({ rotationPolicy: null })).toBe(
            "standalone",
        );
    });

    it("makes the key a CA key without type but with rotation", () => {
        expect(importedKeyChainType({ rotationPolicy: rotating })).toBe(
            "internalChain",
        );
        expect(
            importedKeyChainType({
                crt: [ca.toString("pem")],
                rotationPolicy: rotating,
            }),
        ).toBe("internalChain");
    });

    it.each([
        ["PEM", () => standalone.toString("pem")],
        ["base64 DER", () => standalone.toString("base64")],
    ])(
        "keeps the self-signed certificate of a standalone key chain (%s) as signing key",
        (_, entry) => {
            expect(
                importedKeyChainType({
                    crt: [entry()],
                    rotationPolicy: rotating,
                }),
            ).toBe("standalone");
        },
    );

    it.each([
        ["two certificates", () => [standalone.toString(), ca.toString()]],
        ["an entry that does not parse", () => ["not a certificate"]],
    ])("takes the CA path for %s, which reports problems", (_, crt) => {
        expect(
            importedKeyChainType({ crt: crt(), rotationPolicy: rotating }),
        ).toBe("internalChain");
    });
});
