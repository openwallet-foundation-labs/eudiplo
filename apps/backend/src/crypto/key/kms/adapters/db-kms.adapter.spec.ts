import { exportJWK, generateKeyPair, importJWK } from "jose";
import { describe, expect, it } from "vitest";
import { signingAlgSpec } from "../../domain/signing-algs.js";
import { DbKmsAdapter } from "./db-kms.adapter.js";

describe("DbKmsAdapter curves", () => {
    it("offers ES256, ES384 and ES512 with ES256 as default", () => {
        expect(new DbKmsAdapter("db").capabilities).toMatchObject({
            supportedAlgs: ["ES256", "ES384", "ES512"],
            defaultAlg: "ES256",
        });
    });

    it.each(["ES256", "ES384", "ES512"] as const)(
        "generates %s keys and signs with the matching hash",
        async (alg) => {
            const adapter = new DbKmsAdapter("db");
            const { ref } = await adapter.generateKey({ kid: "k", alg });
            const spec = signingAlgSpec(alg);
            expect(ref.publicJwk.crv).toBe(spec.crv);
            expect(ref.alg).toBe(alg);

            const data = new TextEncoder().encode("payload");
            const signature = await adapter.sign(ref, data);
            expect(signature).toHaveLength(spec.coordinateSize * 2);

            const publicKey = (await importJWK(
                ref.publicJwk,
                alg,
            )) as CryptoKey;
            await expect(
                globalThis.crypto.subtle.verify(
                    { name: "ECDSA", hash: spec.hash },
                    publicKey,
                    signature as BufferSource,
                    data as BufferSource,
                ),
            ).resolves.toBe(true);
        },
    );

    it("takes the algorithm of an imported key from its curve", async () => {
        const { privateKey } = await generateKeyPair("ES384", {
            extractable: true,
        });
        const privateJwk = await exportJWK(privateKey);

        const { ref } = await new DbKmsAdapter("db").importKey({
            kid: "k",
            privateJwk,
        });

        expect(ref.alg).toBe("ES384");
        expect(ref.privateJwk?.alg).toBe("ES384");
    });

    it("rejects an import whose curve does not fit the requested algorithm", async () => {
        const { privateKey } = await generateKeyPair("ES384", {
            extractable: true,
        });
        await expect(
            new DbKmsAdapter("db").importKey({
                kid: "k",
                privateJwk: await exportJWK(privateKey),
                alg: "ES256",
            }),
        ).rejects.toThrow(/cannot be used with ES256/);
    });

    it("limits imports to the configured algorithms but keeps generating for rotation", async () => {
        const adapter = new DbKmsAdapter("db", { algorithms: ["ES256"] });
        const { privateKey } = await generateKeyPair("ES512", {
            extractable: true,
        });
        await expect(
            adapter.importKey({
                kid: "k",
                privateJwk: await exportJWK(privateKey),
            }),
        ).rejects.toThrow(/unsupported alg 'ES512'/);

        // Rotation of an existing ES512 key chain still works.
        const { ref } = await adapter.generateKey({ kid: "k", alg: "ES512" });
        expect(ref.publicJwk.crv).toBe("P-521");
    });
});
