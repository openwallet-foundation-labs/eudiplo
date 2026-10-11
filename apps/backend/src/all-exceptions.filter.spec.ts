import type { ArgumentsHost } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { AllExceptionsFilter } from "./all-exceptions.filter.js";
import { ClientIdTaken } from "./auth/client/domain/client-data.js";
import { TenantNotFound } from "./auth/tenant/domain/tenant-data.js";
import { CredentialConfigurationNotFound } from "./issuer/configuration/credentials/domain/credential-configuration.js";
import { IssuanceConfigurationNotFound } from "./issuer/configuration/issuance/domain/issuance-configuration.js";
import { SessionNotFound } from "./session/application/session-errors.js";

function respond(exception: unknown) {
    const json = vi.fn();
    const status = vi.fn().mockReturnValue({ json });
    const host = {
        switchToHttp: () => ({
            getResponse: () => ({ status }),
            getRequest: () => ({ method: "GET", path: "/x", url: "/x" }),
        }),
    } as unknown as ArgumentsHost;
    new AllExceptionsFilter().catch(exception, host);
    return { status: status.mock.calls[0][0], body: json.mock.calls[0][0] };
}

function statusFor(exception: unknown): number {
    return respond(exception).status;
}

describe("AllExceptionsFilter", () => {
    it.each([
        ["session", new SessionNotFound()],
        ["tenant", new TenantNotFound("t1")],
        ["issuance configuration", new IssuanceConfigurationNotFound("t1")],
        [
            "credential configuration",
            new CredentialConfigurationNotFound("t1", "c1"),
        ],
    ])("maps a missing %s to 404", (_name, error) => {
        expect(statusFor(error)).toBe(404);
    });

    it("maps a conflict to 409 and keeps its message in production", () => {
        vi.stubEnv("NODE_ENV", "production");
        try {
            const { status, body } = respond(new ClientIdTaken("c1"));
            expect(status).toBe(409);
            expect(body.message).toBe("Client ID 'c1' is already in use");
            expect(respond(new Error("internal detail")).body.message).toBe(
                "Internal Server Error",
            );
        } finally {
            vi.unstubAllEnvs();
        }
    });

    it("keeps unknown errors as 500", () => {
        expect(statusFor(new Error("boom"))).toBe(500);
    });
});
