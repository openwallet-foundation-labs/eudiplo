import {
    CoseInvalidAlgorithmError,
    cborEncode,
    Sign1,
    SignatureAlgorithm,
} from "@owf/cose";
import { CoseKey } from "@owf/mdoc";
import { exportJWK, generateKeyPair } from "jose";
import { describe, expect, it } from "vitest";
import { coseReadyJwk } from "../../shared/utils/cose-key-jwk.util.js";
import { mdocContext } from "./mdoc-context.js";

type Alg = "ES256" | "ES384" | "ES512";

const hashOf = (alg: Alg) => `SHA-${alg.slice(2)}`;

async function keysFor(alg: Alg) {
    const { privateKey, publicKey } = await generateKeyPair(alg, {
        extractable: true,
    });
    const toCoseKey = async (key: CryptoKey) =>
        CoseKey.fromJwk(
            coseReadyJwk((await exportJWK(key)) as Record<string, unknown>),
        );
    return {
        privateKey: privateKey as CryptoKey,
        publicKey: publicKey as CryptoKey,
        signingKey: await toCoseKey(privateKey as CryptoKey),
        verificationKey: await toCoseKey(publicKey as CryptoKey),
    };
}

/**
 * A Sig_structure with any `alg`, signed with WebCrypto: @owf/cose refuses to
 * sign with fully-specified or mismatching identifiers itself.
 */
async function signedSigStructure(
    alg: Alg,
    privateKey: CryptoKey,
    protectedHeaders: Map<number, unknown>,
) {
    const toBeVerified = Sign1.create({
        protectedHeaders,
        payload: new TextEncoder().encode("payload"),
    }).toBeSigned();
    const signature = new Uint8Array(
        await globalThis.crypto.subtle.sign(
            { name: "ECDSA", hash: hashOf(alg) },
            privateKey,
            toBeVerified as BufferSource,
        ),
    );
    return { toBeVerified, signature };
}

describe("mdocContext COSE_Sign1", () => {
    it.each([
        ["ES256", 64],
        ["ES384", 96],
        ["ES512", 132],
    ] as const)("signs and verifies with %s keys", async (alg, length) => {
        const { publicKey, signingKey, verificationKey } = await keysFor(alg);
        const sign1 = await Sign1.create({
            protectedHeaders: new Map([[1, SignatureAlgorithm[alg]]]),
            payload: new TextEncoder().encode("payload"),
        }).sign(
            { signingKey, algorithm: SignatureAlgorithm[alg] },
            mdocContext.cose.sign1,
        );

        expect(sign1.signature).toHaveLength(length);
        // Independent check that the hash fits the curve (SHA-384 for P-384, …).
        await expect(
            globalThis.crypto.subtle.verify(
                { name: "ECDSA", hash: hashOf(alg) },
                publicKey,
                sign1.signature as BufferSource,
                sign1.toBeSigned() as BufferSource,
            ),
        ).resolves.toBe(true);
        await expect(
            sign1.verifySignature(
                { key: verificationKey },
                mdocContext.cose.sign1,
            ),
        ).resolves.toBe(true);
    });

    it.each([
        ["ES256", -9],
        ["ES384", -51],
        ["ES512", -52],
    ] as const)(
        "verifies %s with the fully-specified alg %i",
        async (alg, coseAlg) => {
            const { privateKey, verificationKey } = await keysFor(alg);
            const { toBeVerified, signature } = await signedSigStructure(
                alg,
                privateKey,
                new Map([[1, coseAlg]]),
            );

            await expect(
                mdocContext.cose.sign1.verify({
                    key: verificationKey,
                    signature,
                    toBeVerified,
                }),
            ).resolves.toBe(true);
        },
    );

    it.each([
        // header names a different curve than the key
        ["ES384", -7, "ES256"],
        ["ES256", -35, "ES384"],
        ["ES256", -51, "ES384"],
        ["ES512", -9, "ES256"],
    ] as const)(
        "rejects a %s key under alg %i",
        async (keyAlg, coseAlg, headerAlg) => {
            const { privateKey, verificationKey } = await keysFor(keyAlg);
            // Signed with the key's own hash: without the alg check the
            // signature would verify.
            const { toBeVerified, signature } = await signedSigStructure(
                keyAlg,
                privateKey,
                new Map([[1, coseAlg]]),
            );

            await expect(
                mdocContext.cose.sign1.verify({
                    key: verificationKey,
                    signature,
                    toBeVerified,
                }),
            ).rejects.toThrow(
                `COSE_Sign1 alg ${coseAlg} (${headerAlg}) does not match`,
            );
        },
    );

    it("leaves a fully-specified IssuerAuth alg unverifiable, as issuerauth_alg_values says", async () => {
        // @owf/cose refuses alg values outside its classic enum before
        // EUDIPLO's check runs; if that changes, issuerauth_alg_values in
        // OID4VP requests may list -9, -51 and -52 as well.
        const { privateKey, verificationKey } = await keysFor("ES256");
        const { signature } = await signedSigStructure(
            "ES256",
            privateKey,
            new Map([[1, -9]]),
        );
        const sign1 = Sign1.create({
            protectedHeaders: new Map([[1, -9]]),
            payload: new TextEncoder().encode("payload"),
            signature,
        });

        await expect(
            sign1.verifySignature(
                { key: verificationKey },
                mdocContext.cose.sign1,
            ),
        ).rejects.toThrow(CoseInvalidAlgorithmError);
    });

    it("rejects a COSE_Sign1 without alg", async () => {
        const { privateKey, verificationKey } = await keysFor("ES256");
        const { toBeVerified, signature } = await signedSigStructure(
            "ES256",
            privateKey,
            new Map(),
        );

        await expect(
            mdocContext.cose.sign1.verify({
                key: verificationKey,
                signature,
                toBeVerified,
            }),
        ).rejects.toThrow(/no alg in its protected header/);
    });

    it("rejects an alg other than ES256, ES384 or ES512", async () => {
        const { privateKey, verificationKey } = await keysFor("ES256");
        const { toBeVerified, signature } = await signedSigStructure(
            "ES256",
            privateKey,
            new Map([[1, -8]]),
        );

        await expect(
            mdocContext.cose.sign1.verify({
                key: verificationKey,
                signature,
                toBeVerified,
            }),
        ).rejects.toThrow(/Unsupported COSE_Sign1 alg -8/);
    });

    it("rejects bytes that are not a Sig_structure", async () => {
        const { verificationKey } = await keysFor("ES256");

        await expect(
            mdocContext.cose.sign1.verify({
                key: verificationKey,
                signature: new Uint8Array(64),
                toBeVerified: new TextEncoder().encode("to be signed"),
            }),
        ).rejects.toThrow(/Signature1 Sig_structure/);
    });

    it("rejects a Sig_structure other than Signature1", async () => {
        const { verificationKey } = await keysFor("ES256");

        await expect(
            mdocContext.cose.sign1.verify({
                key: verificationKey,
                signature: new Uint8Array(64),
                toBeVerified: cborEncode([
                    "Signature",
                    new Uint8Array(),
                    new Uint8Array(),
                    new Uint8Array(),
                ]),
            }),
        ).rejects.toThrow(/Signature1 Sig_structure/);
    });

    it("refuses to sign with an alg of another curve", async () => {
        const { signingKey } = await keysFor("ES384");

        await expect(
            mdocContext.cose.sign1.sign({
                key: signingKey,
                toBeSigned: new Uint8Array([1]),
                algorithm: SignatureAlgorithm.ES256,
            }),
        ).rejects.toThrow(/does not match the P-384 key/);
    });
});
