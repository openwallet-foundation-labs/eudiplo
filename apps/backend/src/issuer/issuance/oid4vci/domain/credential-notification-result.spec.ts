import { describe, expect, it } from "vitest";
import { credentialNotificationResult } from "./credential-notification-result.js";

describe("credentialNotificationResult", () => {
    it("records credential_accepted as the wallet's success without failure fields", () => {
        expect(credentialNotificationResult("credential_accepted")).toEqual({
            outcome: { result: "success", source: "wallet" },
            failureCode: null,
            errorReason: null,
        });
    });

    it.each([
        ["credential_deleted", "The wallet user rejected the credential"],
        ["credential_failure", "The wallet could not store the credential"],
    ] as const)(
        "records %s as the wallet's failure with its description",
        (event, message) => {
            expect(credentialNotificationResult(event, "Why")).toEqual({
                outcome: {
                    result: "failed",
                    source: "wallet",
                    error: event,
                    message,
                    description: "Why",
                },
                failureCode: event,
                errorReason: message,
            });
        },
    );

    it("leaves the description out of the outcome when the wallet sent none", () => {
        expect(
            credentialNotificationResult("credential_failure").outcome,
        ).not.toHaveProperty("description");
    });
});
