import { describe, expect, it } from "vitest";
import { typeOfSession } from "./session-list.js";

describe("typeOfSession", () => {
    it("tells presentation sessions by their presentation configuration", () => {
        expect(typeOfSession({ requestId: "age-check" })).toBe("presentation");
        expect(typeOfSession({ requestId: null })).toBe("issuance");
        expect(typeOfSession({})).toBe("issuance");
        // Like the store's `requestId IS NULL`, an empty ID is a presentation.
        expect(typeOfSession({ requestId: "" })).toBe("presentation");
    });
});
