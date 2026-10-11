import { OAuth2Client } from "@badgateway/oauth2-client";
import { HttpService } from "@nestjs/axios";
import axios from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RegistrarConfigEntity } from "./entities/registrar-config.entity.js";
import { RegistrarAuthService } from "./registrar-auth.service.js";

/**
 * Token cache and per-call clients, with the OAuth2 client mocked. The
 * outbound requests themselves are tested in registrar-auth.service.spec.ts.
 */
vi.mock("@badgateway/oauth2-client", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@badgateway/oauth2-client")>()),
    OAuth2Client: vi.fn(),
}));

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
        service = new RegistrarAuthService(
            {
                findOneBy: vi.fn(async ({ tenantId }) => stored.get(tenantId)),
            } as any,
            { assertSafeUrl: vi.fn().mockResolvedValue(undefined) } as any,
            new HttpService(axios.create()),
        );
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
