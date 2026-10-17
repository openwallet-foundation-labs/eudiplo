import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { FederationEntityUnavailableError } from "../../../trust/ports/federation-entity-provider.js";
import { FederationEntityNotConfiguredError } from "./application/publish-entity-configuration.js";
import { FederationEntityController } from "./federation-entity.controller.js";

function controller(execute: () => Promise<string>) {
    const res = { status: vi.fn(), setHeader: vi.fn() };
    return {
        res,
        get: () =>
            new FederationEntityController({
                execute,
            } as never).entityConfiguration("tenant", res as never),
    };
}

describe("FederationEntityController", () => {
    it("serves the entity configuration as application/entity-statement+jwt", async () => {
        const { res, get } = controller(async () => "header.payload.signature");

        await expect(get()).resolves.toBe("header.payload.signature");
        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.setHeader).toHaveBeenCalledWith(
            "Content-Type",
            "application/entity-statement+jwt",
        );
    });

    it.each([
        [
            "a tenant without federation entity",
            new FederationEntityNotConfiguredError("tenant"),
            404,
            "not_found",
        ],
        [
            "a missing federation key chain",
            new NotFoundException(
                "No key chain found with usage type 'federation'",
            ),
            404,
            "not_found",
        ],
        [
            "a trust engine that does not deliver",
            new FederationEntityUnavailableError(
                "trust engine answered with status 500",
            ),
            503,
            "temporarily_unavailable",
        ],
        ["any other failure", new Error("kms down"), 500, "server_error"],
    ])(
        "answers %s with an OpenID Federation error response",
        async (_case, error, status, code) => {
            const { res, get } = controller(() => Promise.reject(error));

            const body = JSON.parse(await get());

            expect(res.status).toHaveBeenCalledWith(status);
            expect(body).toEqual({
                error: code,
                error_description: expect.any(String),
            });
            // Internal reasons stay in the server log.
            expect(body.error_description).not.toMatch(/500|kms|key chain/);
        },
    );
});
