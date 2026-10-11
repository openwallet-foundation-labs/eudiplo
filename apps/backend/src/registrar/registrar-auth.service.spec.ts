import { OAuth2Client } from "@badgateway/oauth2-client";
import { BadRequestException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrarConfigEntity } from "./entities/registrar-config.entity.js";
import {
    relyingPartyControllerFindAll,
    relyingPartyControllerRegister,
} from "./generated/index.js";
import { RegistrarAuthService } from "./registrar-auth.service.js";

vi.mock("./generated/index.js", async (importOriginal) => ({
    ...(await importOriginal<typeof import("./generated/index.js")>()),
    relyingPartyControllerFindAll: vi.fn(),
    relyingPartyControllerRegister: vi.fn(),
}));

vi.mock("@badgateway/oauth2-client", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@badgateway/oauth2-client")>()),
    OAuth2Client: vi.fn(),
}));

describe("RegistrarAuthService.getRelyingPartyId", () => {
    let service: RegistrarAuthService;

    beforeEach(() => {
        vi.mocked(relyingPartyControllerFindAll).mockReset();
        vi.mocked(relyingPartyControllerRegister).mockReset();
        service = new RegistrarAuthService({} as any);
        vi.spyOn(service, "getClient").mockResolvedValue({} as any);
    });

    it("returns the first existing relying party without registering one", async () => {
        vi.mocked(relyingPartyControllerFindAll).mockResolvedValue({
            data: [{ id: "rp-1" }, { id: "rp-2" }],
        } as any);

        await expect(service.getRelyingPartyId("tenant")).resolves.toBe("rp-1");
        expect(relyingPartyControllerRegister).not.toHaveBeenCalled();
    });

    it("registers a relying party when none exists", async () => {
        vi.mocked(relyingPartyControllerFindAll).mockResolvedValue({
            data: [],
        } as any);
        vi.mocked(relyingPartyControllerRegister).mockResolvedValue({
            data: { id: "rp-new" },
        } as any);

        await expect(service.getRelyingPartyId("tenant")).resolves.toBe(
            "rp-new",
        );
    });

    it("throws a BadRequestException when the registrar rejects the registration", async () => {
        vi.mocked(relyingPartyControllerFindAll).mockResolvedValue({
            data: [],
        } as any);
        vi.mocked(relyingPartyControllerRegister).mockResolvedValue({
            data: undefined,
            error: { statusCode: 403, message: "Forbidden" },
        } as any);

        await expect(service.getRelyingPartyId("tenant")).rejects.toThrow(
            new BadRequestException(
                "Failed to register relying party at registrar",
            ),
        );
    });
});

describe("RegistrarAuthService.getClient", () => {
    const tenantA = {
        tenantId: "tenant-a",
        registrarUrl: "https://registrar.example/api",
        oidcUrl: "https://auth.example/realms/registrar",
        clientId: "client",
        username: "user-a",
        password: "password-a",
    } as RegistrarConfigEntity;
    const tenantB = {
        ...tenantA,
        tenantId: "tenant-b",
        registrarUrl: "https://registrar.b.example/api",
        username: "user-b",
    } as RegistrarConfigEntity;
    let stored: Map<string, RegistrarConfigEntity>;
    let service: RegistrarAuthService;

    async function token(
        client: Awaited<ReturnType<typeof service.getClient>>,
    ) {
        const auth = client.getConfig().auth;
        return typeof auth === "function" ? auth({} as any) : auth;
    }

    beforeEach(() => {
        stored = new Map([
            [tenantA.tenantId, tenantA],
            [tenantB.tenantId, tenantB],
        ]);
        let issued = 0;
        vi.mocked(OAuth2Client).mockReset();
        vi.mocked(OAuth2Client).mockImplementation(function () {
            return {
                password: vi.fn(async () => ({
                    accessToken: `token-${++issued}`,
                    expiresAt: Date.now() + 3_600_000,
                })),
            } as any;
        });
        service = new RegistrarAuthService({
            findOneBy: vi.fn(async ({ tenantId }) => stored.get(tenantId)),
        } as any);
    });

    it("reuses the cached token while the configuration stays the same", async () => {
        const first = await service.getClient(tenantA.tenantId);
        const second = await service.getClient(tenantA.tenantId);

        expect(await token(second)).toBe(await token(first));
        expect(OAuth2Client).toHaveBeenCalledTimes(1);
    });

    it.each([
        ["oidcUrl", "https://auth.other.example/realms/x"],
        ["clientId", "other-client"],
        ["username", "other-user"],
    ] as const)(
        "does not reuse a cached token after %s changes",
        async (field, value) => {
            const first = await service.getClient(tenantA.tenantId);
            stored.set(tenantA.tenantId, {
                ...tenantA,
                [field]: value,
            } as RegistrarConfigEntity);

            const second = await service.getClient(tenantA.tenantId);

            expect(await token(second)).not.toBe(await token(first));
            expect(OAuth2Client).toHaveBeenCalledTimes(2);
        },
    );

    it("does not send a cached token to a changed registrar URL", async () => {
        const first = await service.getClient(tenantA.tenantId);
        // A token request still in flight caches its token after the update
        // cleared the cache, so the cache is not invalidated here.
        stored.set(tenantA.tenantId, {
            ...tenantA,
            registrarUrl: "https://attacker.example/api",
        } as RegistrarConfigEntity);

        const second = await service.getClient(tenantA.tenantId);

        expect(second.getConfig().baseUrl).toBe("https://attacker.example/api");
        expect(await token(second)).not.toBe(await token(first));
        expect(OAuth2Client).toHaveBeenCalledTimes(2);
    });

    it("keeps the URL and token of each tenant's client", async () => {
        const clientA = await service.getClient(tenantA.tenantId);
        const clientB = await service.getClient(tenantB.tenantId);

        expect(clientA.getConfig().baseUrl).toBe(tenantA.registrarUrl);
        expect(clientB.getConfig().baseUrl).toBe(tenantB.registrarUrl);
        expect(await token(clientA)).not.toBe(await token(clientB));
    });
});
