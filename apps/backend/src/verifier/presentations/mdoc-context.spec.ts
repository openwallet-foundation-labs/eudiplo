import { CoseKey } from "@owf/mdoc";
import { exportJWK, generateKeyPair } from "jose";
import { describe, expect, it } from "vitest";
import { coseReadyJwk } from "../../shared/utils/cose-key-jwk.util.js";
import { mdocContext } from "./mdoc-context.js";

describe("mdocContext COSE_Sign1 curves", () => {
    it.each([
        ["ES256", 64],
        ["ES384", 96],
        ["ES512", 132],
    ] as const)("signs and verifies with %s keys", async (alg, length) => {
        const { privateKey, publicKey } = await generateKeyPair(alg, {
            extractable: true,
        });
        const signingKey = CoseKey.fromJwk(
            coseReadyJwk(
                (await exportJWK(privateKey)) as Record<string, unknown>,
            ),
        );
        const verificationKey = CoseKey.fromJwk(
            coseReadyJwk(
                (await exportJWK(publicKey)) as Record<string, unknown>,
            ),
        );
        const toBeSigned = new TextEncoder().encode("to be signed");

        const signature = await mdocContext.cose.sign1.sign({
            key: signingKey,
            toBeSigned,
        } as never);

        expect(signature).toHaveLength(length);
        // Independent check that the hash fits the curve (SHA-384 for P-384, …).
        await expect(
            globalThis.crypto.subtle.verify(
                { name: "ECDSA", hash: `SHA-${alg.slice(2)}` },
                publicKey as CryptoKey,
                signature as BufferSource,
                toBeSigned as BufferSource,
            ),
        ).resolves.toBe(true);
        await expect(
            mdocContext.cose.sign1.verify({
                key: verificationKey,
                signature,
                toBeVerified: toBeSigned,
            } as never),
        ).resolves.toBe(true);
    });
});
