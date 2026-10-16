import { describe, expect, test } from "vitest";
import { CredentialFormat } from "../../../issuer/configuration/credentials/entities/credential.entity.js";
import { CryptoImplementationService } from "./crypto-implementation.service.js";

describe("CryptoImplementationService", () => {
    const service = new CryptoImplementationService();

    test("returns the classic COSE algs for mDOC IssuerAuth", () => {
        expect(service.getAlgs(CredentialFormat.MSO_MDOC)).toEqual([
            -7, -35, -36,
        ]);
    });

    test("accepts classic and fully-specified COSE algs for mDOC DeviceAuth", () => {
        expect(service.getMdocDeviceAuthAlgs()).toEqual([
            -7, -35, -36, -9, -51, -52,
        ]);
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
        // Only the identifier placed in the IssuerAuth `alg` header.
        expect(
            service.getSigningAlgs(CredentialFormat.MSO_MDOC, "ES384"),
        ).toEqual([-35]);
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
