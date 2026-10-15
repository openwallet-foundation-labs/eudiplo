import { describe, expect, it } from "vitest";
import {
    getRevocationCert,
    ServiceTypeIdentifiers,
    TrustedEntity,
} from "./types.js";

describe("getRevocationCert", () => {
    const walletRevocation = {
        serviceTypeIdentifier: ServiceTypeIdentifiers.WalletSolutionRevocation,
        certValue: "wallet-revocation",
    };
    const eaaRevocation = {
        serviceTypeIdentifier: ServiceTypeIdentifiers.EaaRevocation,
        certValue: "eaa-revocation",
    };
    const both: TrustedEntity = { services: [eaaRevocation, walletRevocation] };

    it("prefers WalletSolution/Revocation for a wallet solution service", () => {
        expect(
            getRevocationCert(both, ServiceTypeIdentifiers.WalletSolution),
        ).toBe(walletRevocation);
    });

    it("falls back to EAA/Revocation for a wallet solution service", () => {
        expect(
            getRevocationCert(
                { services: [eaaRevocation] },
                ServiceTypeIdentifiers.WalletSolutionIssuance,
            ),
        ).toBe(eaaRevocation);
    });

    it("uses EAA/Revocation for other services", () => {
        expect(
            getRevocationCert(both, ServiceTypeIdentifiers.EaaIssuance),
        ).toBe(eaaRevocation);
    });

    it("ignores WalletSolution/Revocation for other services", () => {
        expect(
            getRevocationCert(
                { services: [walletRevocation] },
                ServiceTypeIdentifiers.EaaIssuance,
            ),
        ).toBeUndefined();
    });
});
