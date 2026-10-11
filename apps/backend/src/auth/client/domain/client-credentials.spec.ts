import { describe, expect, it } from "vitest";
import { nextTokensValidAfter } from "./client-credentials.js";

const NOW = new Date("2026-10-11T12:00:00Z");
const EARLIER = new Date("2026-10-01T08:00:00Z");

describe("nextTokensValidAfter", () => {
    it("starts a new client's tokens now", () => {
        expect(nextTokensValidAfter(null, false, NOW)).toBe(NOW);
    });

    it("ends the tokens of a client whose secret changes", () => {
        expect(
            nextTokensValidAfter({ tokensValidAfter: EARLIER }, false, NOW),
        ).toBe(NOW);
        expect(nextTokensValidAfter({}, false, NOW)).toBe(NOW);
    });

    it("keeps the tokens of a client stored with its own secret", () => {
        expect(
            nextTokensValidAfter({ tokensValidAfter: EARLIER }, true, NOW),
        ).toBe(EARLIER);
    });

    it("keeps a client from before 10.0 unlimited while its secret stays", () => {
        expect(
            nextTokensValidAfter({ tokensValidAfter: null }, true, NOW),
        ).toBeUndefined();
        expect(nextTokensValidAfter({}, true, NOW)).toBeUndefined();
    });
});
