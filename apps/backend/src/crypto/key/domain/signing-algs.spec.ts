import { describe, expect, it } from "vitest";
import {
    derEcdsaToRaw,
    externalAlgorithmPolicy,
    providerAlgRefusal,
    resolveAlgorithmCapabilities,
    signingAlgForCoseAlg,
    signingAlgForCurve,
    signingAlgForJwk,
} from "./signing-algs.js";

describe("signing algorithms", () => {
    it.each([
        ["P-256", "ES256"],
        ["P-384", "ES384"],
        ["P-521", "ES512"],
    ])("binds %s to %s", (crv, alg) => {
        expect(signingAlgForCurve(crv)).toBe(alg);
        expect(signingAlgForJwk({ kty: "EC", crv })).toBe(alg);
    });

    it("rejects other curves and key types", () => {
        expect(signingAlgForCurve("secp256k1")).toBeUndefined();
        expect(() => signingAlgForJwk({ kty: "OKP", crv: "Ed25519" })).toThrow(
            /Unsupported key/,
        );
    });

    it.each([
        [-7, "ES256"],
        [-9, "ES256"],
        [-35, "ES384"],
        [-51, "ES384"],
        [-36, "ES512"],
        [-52, "ES512"],
    ])("binds COSE alg %i to %s", (coseAlg, alg) => {
        expect(signingAlgForCoseAlg(coseAlg)).toBe(alg);
    });

    it("knows no other COSE algs", () => {
        expect(signingAlgForCoseAlg(-8)).toBeUndefined();
        expect(signingAlgForCoseAlg("-7")).toBeUndefined();
        expect(signingAlgForCoseAlg(undefined)).toBeUndefined();
    });

    it("rejects a key whose alg does not fit its curve", () => {
        expect(() =>
            signingAlgForJwk({ kty: "EC", crv: "P-384", alg: "ES256" }),
        ).toThrow(/does not match its curve/);
    });
});

describe("resolveAlgorithmCapabilities", () => {
    const all = ["ES256", "ES384", "ES512"] as const;

    it("offers everything the adapter can do with ES256 as default", () => {
        expect(resolveAlgorithmCapabilities(all)).toEqual({
            supportedAlgs: ["ES256", "ES384", "ES512"],
            defaultAlg: "ES256",
        });
    });

    it("narrows to the configured algorithms", () => {
        expect(
            resolveAlgorithmCapabilities(all, { algorithms: ["ES384"] }),
        ).toEqual({ supportedAlgs: ["ES384"], defaultAlg: "ES384" });
        expect(
            resolveAlgorithmCapabilities(all, {
                algorithms: ["ES256", "ES512"],
                defaultAlgorithm: "ES512",
            }),
        ).toEqual({ supportedAlgs: ["ES256", "ES512"], defaultAlg: "ES512" });
    });

    it("rejects a default outside the configured algorithms", () => {
        expect(() =>
            resolveAlgorithmCapabilities(all, {
                algorithms: ["ES256"],
                defaultAlgorithm: "ES384",
            }),
        ).toThrow(/defaultAlgorithm 'ES384'/);
    });

    it("limits external providers to their default unless configured", () => {
        expect(
            resolveAlgorithmCapabilities(all, externalAlgorithmPolicy()),
        ).toEqual({ supportedAlgs: ["ES256"], defaultAlg: "ES256" });
        expect(
            resolveAlgorithmCapabilities(
                all,
                externalAlgorithmPolicy({ defaultAlgorithm: "ES384" }),
            ),
        ).toEqual({ supportedAlgs: ["ES384"], defaultAlg: "ES384" });
        expect(
            resolveAlgorithmCapabilities(
                all,
                externalAlgorithmPolicy({ algorithms: ["ES256", "ES512"] }),
            ),
        ).toEqual({ supportedAlgs: ["ES256", "ES512"], defaultAlg: "ES256" });
    });
});

describe("providerAlgRefusal", () => {
    it("accepts an algorithm the provider offers", () => {
        expect(
            providerAlgRefusal(
                "db",
                ["ES256", "ES384"],
                "ES384",
                "new key chains",
            ),
        ).toBeUndefined();
    });

    it("names the provider, the algorithm and what it offers", () => {
        expect(
            providerAlgRefusal("hsm", ["ES256"], "ES512", "the imported key"),
        ).toBe(
            "KMS provider 'hsm' does not offer ES512 for the imported key. Supported: ES256",
        );
    });
});

describe("derEcdsaToRaw", () => {
    it("pads short integers and strips sign bytes", () => {
        // SEQUENCE { INTEGER 0x00 0x80 (positive 0x80), INTEGER 0x01 }
        const der = Uint8Array.from([
            0x30, 0x07, 0x02, 0x02, 0x00, 0x80, 0x02, 0x01, 0x01,
        ]);
        const raw = derEcdsaToRaw(der, 4);
        expect([...raw]).toEqual([0, 0, 0, 0x80, 0, 0, 0, 1]);
    });

    it("reads long-form lengths of P-521 signatures", () => {
        const r = new Uint8Array(66).fill(0x11);
        const s = new Uint8Array(66).fill(0x22);
        const body = [0x02, 66, ...r, 0x02, 66, ...s];
        const der = Uint8Array.from([0x30, 0x81, body.length, ...body]);
        const raw = derEcdsaToRaw(der, 66);
        expect(raw).toHaveLength(132);
        expect(raw.subarray(0, 66)).toEqual(r);
        expect(raw.subarray(66)).toEqual(s);
    });

    it("rejects integers longer than the curve", () => {
        const der = Uint8Array.from([0x30, 0x06, 0x02, 0x02, 1, 2, 0x02, 0x00]);
        expect(() => derEcdsaToRaw(der, 1)).toThrow(/too long/);
    });
});
