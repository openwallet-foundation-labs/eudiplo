import { describe, expect, test } from "vitest";
import { CredentialFormat } from "../../../issuer/configuration/credentials/entities/credential.entity.js";
import { CryptoImplementationService } from "./crypto-implementation.service.js";

describe("CryptoImplementationService", () => {
    const service = new CryptoImplementationService();

    test("returns both classic and fully-specified COSE alg values for mDOC", () => {
        const algs = service.getAlgs(CredentialFormat.MSO_MDOC);

        expect(algs).toEqual(expect.arrayContaining([-7, -9, -35, -36]));
    });

    test("returns JOSE alg values for SD-JWT VC", () => {
        expect(service.getAlgs(CredentialFormat.SD_JWT_VC)).toEqual([
            "ES256",
            "ES384",
            "ES512",
        ]);
    });

    test("names one algorithm for credential_signing_alg_values_supported", () => {
        expect(
            service.getSigningAlgs(CredentialFormat.SD_JWT_VC, "ES384"),
        ).toEqual(["ES384"]);
        expect(
            service.getSigningAlgs(CredentialFormat.MSO_MDOC, "ES384"),
        ).toContain(-35);
        expect(
            service.getSigningAlgs(CredentialFormat.MSO_MDOC, "ES384"),
        ).not.toContain(-7);
    });

    test.each([
        ["P-256", "ES256"],
        ["P-384", "ES384"],
        ["P-521", "ES512"],
    ])("picks the implementation for %s keys", (crv, alg) => {
        expect(service.getCryptoFromJwk({ kty: "EC", crv }).alg).toBe(alg);
    });

    test("rejects keys on other curves", () => {
        expect(() =>
            service.getCryptoFromJwk({ kty: "EC", crv: "secp256k1" }),
        ).toThrow(/unsupported key type or curve/);
    });
});
