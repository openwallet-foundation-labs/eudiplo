import * as x509 from "@peculiar/x509";
import {
    type CryptoKey,
    exportJWK,
    exportSPKI,
    generateKeyPair,
    SignJWT,
} from "jose";
import { describe, expect, it } from "vitest";
import type { TrustFetchService } from "./trust-fetch.service.js";
import { TrustListJwtService } from "./trustlist-jwt.service.js";
import { normalizeTrustListRefs } from "./types.js";

const url = "https://trust.example/list";

async function signedList(alg: string) {
    const { publicKey, privateKey } = await generateKeyPair(alg);
    const jwt = await new SignJWT({ LoTE: {} })
        .setProtectedHeader({ alg })
        .sign(privateKey);
    return { jwt, pem: await exportSPKI(publicKey as CryptoKey) };
}

describe("TrustListJwtService with a PEM verifier key", () => {
    const service = new TrustListJwtService({} as TrustFetchService);

    it.each(["ES256", "ES384", "PS256"])(
        "verifies a list signed with %s",
        async (alg) => {
            const { jwt, pem } = await signedList(alg);
            await expect(
                service.verifyTrustListJwt({ url, verifierKeyPem: pem }, jwt),
            ).resolves.toBeUndefined();
        },
    );

    it("rejects a list signed by another key", async () => {
        const { jwt } = await signedList("ES256");
        const { pem } = await signedList("ES256");
        await expect(
            service.verifyTrustListJwt({ url, verifierKeyPem: pem }, jwt),
        ).rejects.toThrow(`Trust list JWT verification failed for ${url}`);
    });

    it("rejects a header algorithm that does not fit the key", async () => {
        const { pem } = await signedList("ES256");
        const { jwt } = await signedList("PS256");
        await expect(
            service.verifyTrustListJwt({ url, verifierKeyPem: pem }, jwt),
        ).rejects.toThrow("verification failed");
    });
});

describe("TrustListJwtService with a pinned certificate or JWK", () => {
    const service = new TrustListJwtService({} as TrustFetchService);

    it.each([
        ["ES384", "P-384", "SHA-384"],
        ["ES512", "P-521", "SHA-512"],
    ])(
        "verifies a list signed with %s against a certificate",
        async (alg, namedCurve, hash) => {
            x509.cryptoProvider.set(globalThis.crypto);
            const keys = (await globalThis.crypto.subtle.generateKey(
                { name: "ECDSA", namedCurve },
                true,
                ["sign", "verify"],
            )) as CryptoKeyPair;
            const cert = await x509.X509CertificateGenerator.createSelfSigned({
                name: "CN=Trust list signer",
                keys,
                signingAlgorithm: { name: "ECDSA", hash },
            });
            const jwt = await new SignJWT({ LoTE: {} })
                .setProtectedHeader({ alg })
                .sign(keys.privateKey);

            await expect(
                service.verifyTrustListJwt(
                    {
                        url,
                        verifierX509Der: Buffer.from(cert.rawData).toString(
                            "base64",
                        ),
                    },
                    jwt,
                ),
            ).resolves.toBeUndefined();
        },
    );

    it("verifies against a JWK without alg using the header", async () => {
        const { publicKey, privateKey } = await generateKeyPair("ES384", {
            extractable: true,
        });
        const jwt = await new SignJWT({ LoTE: {} })
            .setProtectedHeader({ alg: "ES384" })
            .sign(privateKey);

        await expect(
            service.verifyTrustListJwt(
                { url, verifierKey: await exportJWK(publicKey) },
                jwt,
            ),
        ).resolves.toBeUndefined();
    });
});

describe("normalizeTrustListRefs", () => {
    it("accepts a PEM public key as the only verifier material", () => {
        expect(
            normalizeTrustListRefs([
                { url, verifierKeyPem: "\n-----BEGIN PUBLIC KEY-----\n" },
            ]),
        ).toEqual([{ url, verifierKeyPem: "-----BEGIN PUBLIC KEY-----" }]);
    });

    it("still requires verifier material for an external list", () => {
        expect(() =>
            normalizeTrustListRefs([{ url, verifierKeyPem: "  " }]),
        ).toThrow("must define verifierKey, verifierKeyPem or verifierX509Der");
    });
});
