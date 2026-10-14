import { describe, expect, it } from "vitest";
import { checkRegistrationCertificate } from "./registration-certificate-check.js";

function unsignedJwt(payload: Record<string, unknown>): string {
    const encode = (value: unknown) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
    return `${encode({ alg: "none" })}.${encode(payload)}.`;
}

const now = 1_800_000_000;
const pid = {
    format: "dc+sd-jwt",
    meta: { vct_values: ["urn:eudi:pid:1"] },
};
const dcqlQuery = {
    credentials: [
        {
            id: "pid",
            ...pid,
            claims: [{ path: ["given_name"] }, { path: ["family_name"] }],
        },
    ],
};
const certificate = (claims: string[][], extra: object = {}) =>
    unsignedJwt({
        credentials: [{ ...pid, claim: claims.map((path) => ({ path })) }],
        ...extra,
    });
const check = (jwt: string, skipOveraskingCheck = false) =>
    checkRegistrationCertificate(jwt, dcqlQuery, { skipOveraskingCheck, now });

describe("checkRegistrationCertificate", () => {
    it("returns the payload of a certificate covering the request in any claim order", () => {
        const result = check(
            certificate([["family_name"], ["given_name"]], { exp: now + 10 }),
        );
        expect(result.problem).toBeUndefined();
        expect(result.payload?.exp).toBe(now + 10);
    });

    it("refuses a value that is not a JWT", () => {
        expect(check("not-a-jwt").problem).toEqual({
            code: "INVALID_JWT",
            message: "Registration certificate is not a valid JWT",
        });
    });

    it("tolerates 60 seconds of clock skew on exp and nbf", () => {
        const claims = [["given_name"], ["family_name"]];
        expect(
            check(certificate(claims, { exp: now - 60 })).problem,
        ).toBeUndefined();
        expect(
            check(certificate(claims, { nbf: now + 60 })).problem,
        ).toBeUndefined();
        expect(check(certificate(claims, { exp: now - 61 })).problem).toEqual({
            code: "EXPIRED",
            message: "Registration certificate is expired",
        });
        expect(check(certificate(claims, { nbf: now + 61 })).problem).toEqual({
            code: "NOT_YET_VALID",
            message: "Registration certificate is not yet valid",
        });
    });

    it("refuses a certificate without authorized credentials", () => {
        expect(check(unsignedJwt({})).problem).toEqual({
            code: "NO_AUTHORIZED_CREDENTIALS",
            message: "Registration certificate has no authorized credentials",
        });
    });

    it("refuses overasking and names the unauthorized credential queries", () => {
        expect(check(certificate([["given_name"]])).problem).toEqual({
            code: "OVERASKING",
            message:
                "Registration certificate does not authorize the requested DCQL credentials",
            unauthorizedCredentialIds: ["pid"],
        });
    });

    it("skips the overasking check when asked to, but not the time check", () => {
        expect(
            check(certificate([["given_name"]]), true).problem,
        ).toBeUndefined();
        expect(
            check(certificate([], { exp: now - 3600 }), true).problem?.code,
        ).toBe("EXPIRED");
    });

    it("accepts any certificate for a query without credentials", () => {
        expect(
            checkRegistrationCertificate(unsignedJwt({}), undefined, {
                skipOveraskingCheck: false,
                now,
            }).problem,
        ).toBeUndefined();
    });
});
