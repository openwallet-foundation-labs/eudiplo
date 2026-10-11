import { describe, expect, it } from "vitest";
import { isOpenForWallet, SessionStatus } from "./session-state.js";

describe("isOpenForWallet", () => {
    it.each([
        [SessionStatus.Active, false, true],
        [SessionStatus.Fetched, false, true],
        [SessionStatus.Active, true, false],
        [SessionStatus.Fetched, true, false],
        [SessionStatus.Completed, false, false],
        [SessionStatus.Expired, false, false],
        [SessionStatus.Failed, false, false],
        [SessionStatus.Cancelled, false, false],
    ])(
        "treats a %s session with consumed %s as open: %s",
        (status, consumed, open) => {
            expect(isOpenForWallet({ status, consumed })).toBe(open);
        },
    );
});
