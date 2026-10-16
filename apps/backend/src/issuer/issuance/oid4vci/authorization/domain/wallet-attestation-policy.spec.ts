import { describe, expect, it } from "vitest";
import { RevocationCheckMode } from "../../../../../trust/types.js";
import { resolveWalletAttestationPolicy } from "./wallet-attestation-policy.js";

describe("resolveWalletAttestationPolicy", () => {
    it("uses authorization server wallet attestation settings before issuance defaults", () => {
        const issuerTrustList = [{ url: "https://issuer.example/trust.jwt" }];
        const authServerTrustList = [{ url: "https://as.example/trust.jwt" }];

        expect(
            resolveWalletAttestationPolicy(
                {
                    walletAttestationRequired: false,
                    walletProviderTrustLists: issuerTrustList,
                },
                {
                    walletAttestationRequired: true,
                    walletProviderTrustLists: authServerTrustList,
                },
            ),
        ).toEqual({
            walletAttestationRequired: true,
            walletProviderTrustLists: authServerTrustList,
            walletAttestationStatusCheckMode: RevocationCheckMode.BestEffort,
        });
    });

    it("falls back to issuance-level wallet attestation settings", () => {
        const issuerTrustList = [{ url: "https://issuer.example/trust.jwt" }];

        expect(
            resolveWalletAttestationPolicy({
                walletAttestationRequired: true,
                walletProviderTrustLists: issuerTrustList,
            }),
        ).toEqual({
            walletAttestationRequired: true,
            walletProviderTrustLists: issuerTrustList,
            walletAttestationStatusCheckMode: RevocationCheckMode.BestEffort,
        });
    });

    it("defaults to optional wallet attestation with no trust lists", () => {
        expect(resolveWalletAttestationPolicy({})).toEqual({
            walletAttestationRequired: false,
            walletProviderTrustLists: [],
            walletAttestationStatusCheckMode: RevocationCheckMode.BestEffort,
        });
    });

    it("preserves explicit false and empty AS overrides", () => {
        expect(
            resolveWalletAttestationPolicy(
                {
                    walletAttestationRequired: true,
                    walletProviderTrustLists: [
                        { url: "https://issuer.example/trust.jwt" },
                    ],
                },
                {
                    walletAttestationRequired: false,
                    walletProviderTrustLists: [],
                },
            ),
        ).toEqual({
            walletAttestationRequired: false,
            walletProviderTrustLists: [],
            walletAttestationStatusCheckMode: RevocationCheckMode.BestEffort,
        });
    });

    it("inherits trust independently of the AS requirement override", () => {
        const walletProviderTrustLists = [
            { url: "https://issuer.example/trust.jwt" },
        ];
        expect(
            resolveWalletAttestationPolicy(
                { walletAttestationRequired: true, walletProviderTrustLists },
                { walletAttestationRequired: false },
            ),
        ).toEqual({
            walletAttestationRequired: false,
            walletProviderTrustLists,
            walletAttestationStatusCheckMode: RevocationCheckMode.BestEffort,
        });
    });

    it("resolves the status check mode from the AS, then the issuance config", () => {
        expect(
            resolveWalletAttestationPolicy(
                {
                    walletAttestationStatusCheckMode:
                        RevocationCheckMode.Strict,
                },
                {
                    walletAttestationStatusCheckMode:
                        RevocationCheckMode.Disabled,
                },
            ).walletAttestationStatusCheckMode,
        ).toBe(RevocationCheckMode.Disabled);
        expect(
            resolveWalletAttestationPolicy(
                {
                    walletAttestationStatusCheckMode:
                        RevocationCheckMode.Strict,
                },
                { walletAttestationStatusCheckMode: null },
            ).walletAttestationStatusCheckMode,
        ).toBe(RevocationCheckMode.Strict);
    });
});
