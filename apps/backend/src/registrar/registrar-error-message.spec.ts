import { describe, expect, it } from "vitest";
import { registrarErrorMessage } from "./registrar-error-message.js";

describe("registrarErrorMessage", () => {
    it("prefers the message of a nested error body", () => {
        expect(
            registrarErrorMessage({
                error: { message: "nested" },
                message: "outer",
            }),
        ).toBe("nested");
    });

    it("skips empty strings", () => {
        expect(
            registrarErrorMessage({ message: "", error: "Bad Request" }),
        ).toBe("Bad Request");
    });

    it("joins a list of messages", () => {
        expect(
            registrarErrorMessage({
                message: ["name must not be empty", "version is invalid"],
                error: "Bad Request",
            }),
        ).toBe("name must not be empty; version is invalid");
    });

    it("does not pass on other values", () => {
        expect(
            registrarErrorMessage({ message: { internal: true }, error: [1] }),
        ).toBe("Unknown registrar error");
        expect(registrarErrorMessage(undefined)).toBe(
            "Unknown registrar error",
        );
    });

    it("caps messages longer than 500 characters", () => {
        expect(registrarErrorMessage({ message: "x".repeat(500) })).toBe(
            "x".repeat(500),
        );
        expect(registrarErrorMessage({ message: "x".repeat(501) })).toBe(
            `${"x".repeat(500)}…`,
        );
    });
});
