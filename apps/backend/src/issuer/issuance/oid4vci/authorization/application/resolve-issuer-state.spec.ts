import { describe, expect, it, vi } from "vitest";
import { SessionNotFound } from "../../../../../session/application/session-errors.js";
import { SessionStatus } from "../../../../../session/domain/session-state.js";
import {
    InvalidIssuerState,
    ResolveIssuerState,
} from "./resolve-issuer-state.js";

function fixture(session: Record<string, unknown> = {}) {
    const sessions = {
        getIssuanceForWalletReference: vi.fn().mockResolvedValue({
            id: "session",
            tenantId: "tenant",
            walletNonce: "wallet-ref",
            status: SessionStatus.Active,
            ...session,
        }),
    };
    return { sessions, useCase: new ResolveIssuerState(sessions as never) };
}

describe("ResolveIssuerState", () => {
    it("answers the offer's session ID for its wallet reference", async () => {
        const f = fixture();
        await expect(f.useCase.execute("tenant", "wallet-ref")).resolves.toBe(
            "session",
        );
        expect(
            f.sessions.getIssuanceForWalletReference,
        ).toHaveBeenCalledExactlyOnceWith("tenant", "wallet-ref");
    });

    it("rejects an issuer_state that names no offer, such as a session ID", async () => {
        const f = fixture();
        f.sessions.getIssuanceForWalletReference.mockRejectedValue(
            new SessionNotFound(),
        );
        await expect(
            f.useCase.execute("tenant", "session"),
        ).rejects.toBeInstanceOf(InvalidIssuerState);
    });

    it.each([
        { expiresAt: new Date(Date.now() - 1000) },
        { status: SessionStatus.Completed },
    ])("rejects an offer that can no longer be used: %j", async (session) => {
        const f = fixture(session);
        await expect(
            f.useCase.execute("tenant", "wallet-ref"),
        ).rejects.toBeInstanceOf(InvalidIssuerState);
    });

    it("propagates other failures instead of calling them an invalid issuer_state", async () => {
        const f = fixture();
        const failure = new Error("database unavailable");
        f.sessions.getIssuanceForWalletReference.mockRejectedValue(failure);
        await expect(f.useCase.execute("tenant", "wallet-ref")).rejects.toBe(
            failure,
        );
    });
});
