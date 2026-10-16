import { HttpStatus, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { toOAuthHttpError } from "../../exceptions/token-error.exception.js";
import { verifyClientAttestation } from "./client-attestation.js";
import { OAuthError } from "./oauth-error.js";

describe("verifyClientAttestation", () => {
    const rejected = () =>
        Promise.reject(
            new UnauthorizedException(
                "Wallet provider certificate is not trusted - no matching entity in trust list",
            ),
        );

    it.each([
        { endpoint: "par" as const, status: HttpStatus.BAD_REQUEST },
        { endpoint: "token" as const, status: HttpStatus.UNAUTHORIZED },
    ])(
        "answers a rejected attestation at $endpoint with invalid_client and HTTP $status",
        async ({ endpoint, status }) => {
            const error = await verifyClientAttestation(
                endpoint,
                rejected,
                "tenant t",
            ).catch((e) => e);

            expect(error).toBeInstanceOf(OAuthError);
            expect(error.logDetail).toContain(
                "tenant t: Wallet provider certificate is not trusted",
            );

            // The reason is logged, not returned.
            const logger = { warn: vi.fn(), error: vi.fn() };
            const response = toOAuthHttpError(error, logger) as {
                getStatus(): number;
                getResponse(): unknown;
            };
            expect(response.getStatus()).toBe(status);
            expect(response.getResponse()).toEqual({
                error: "invalid_client",
                error_description: "Client attestation validation failed",
            });
            expect(logger.warn).toHaveBeenCalledWith(error.logDetail);
        },
    );

    it("rejects the client on any error of the check", async () => {
        await expect(
            verifyClientAttestation(
                "token",
                () => Promise.reject(new Error("trust list unavailable")),
                "tenant t",
            ),
        ).rejects.toMatchObject({ code: "invalid_client" });
    });

    it("logs Unknown error for a rejection that is not an Error", async () => {
        await expect(
            verifyClientAttestation(
                "par",
                () => Promise.reject("x"),
                "tenant t",
            ),
        ).rejects.toMatchObject({
            logDetail: expect.stringMatching(/Unknown error$/),
        });
    });

    it("resolves when the attestation is accepted", async () => {
        await expect(
            verifyClientAttestation("par", async () => undefined, "tenant t"),
        ).resolves.toBeUndefined();
    });
});
