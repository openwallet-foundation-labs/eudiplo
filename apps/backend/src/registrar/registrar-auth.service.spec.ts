import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { HttpService } from "@nestjs/axios";
import {
    BadRequestException,
    ServiceUnavailableException,
} from "@nestjs/common";
import axios from "axios";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import { OutboundUrlPolicyService } from "../webhook/outbound-url-policy.service.js";
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

describe("RegistrarAuthService.getRelyingPartyId", () => {
    let service: RegistrarAuthService;
    let configRepository: { findOneBy: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        vi.mocked(relyingPartyControllerFindAll).mockReset();
        vi.mocked(relyingPartyControllerRegister).mockReset();
        configRepository = {
            findOneBy: vi.fn().mockResolvedValue({ relyingPartyContact: null }),
        };
        service = new RegistrarAuthService(
            configRepository as any,
            {} as any,
            {} as any,
        );
        vi.spyOn(service as any, "clientFor").mockResolvedValue({});
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

    it("registers the relying party with the configured contact", async () => {
        configRepository.findOneBy.mockResolvedValue({
            relyingPartyContact: {
                supportUri: "https://verifier.example/support",
                email: "support@verifier.example",
                phone: "+49 30 1234567",
            },
        });
        vi.mocked(relyingPartyControllerFindAll).mockResolvedValue({
            data: [],
        } as any);
        vi.mocked(relyingPartyControllerRegister).mockResolvedValue({
            data: { id: "rp-new" },
        } as any);

        await service.getRelyingPartyId("tenant");

        expect(configRepository.findOneBy).toHaveBeenCalledWith({
            tenantId: "tenant",
        });
        expect(relyingPartyControllerRegister).toHaveBeenCalledWith(
            expect.objectContaining({
                body: {
                    supportUri: "https://verifier.example/support",
                    email: "support@verifier.example",
                    phone: "+49 30 1234567",
                },
            }),
        );
    });

    it("registers the relying party without contact when none is configured", async () => {
        vi.mocked(relyingPartyControllerFindAll).mockResolvedValue({
            data: [],
        } as any);
        vi.mocked(relyingPartyControllerRegister).mockResolvedValue({
            data: { id: "rp-new" },
        } as any);

        await service.getRelyingPartyId("tenant");

        const { body } = vi.mocked(relyingPartyControllerRegister).mock
            .calls[0][0];
        // Undefined fields are left out of the JSON body.
        expect(JSON.parse(JSON.stringify(body))).toEqual({});
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
                "Failed to register relying party at registrar: Forbidden",
            ),
        );
    });
});

/**
 * Real requests against a local server standing in for the registrar and its
 * OIDC provider: both URLs are tenant-controlled and go through the outbound
 * URL policy.
 */
describe("RegistrarAuthService outbound requests", () => {
    let server: Server;
    let localhost: string;
    let loopbackIp: string;
    let closedUrl: string;
    let requests: { method?: string; url?: string }[];

    beforeAll(async () => {
        server = createServer((request, response) => {
            requests.push({ method: request.method, url: request.url });
            request.resume();
            request.on("end", () => {
                response.setHeader("content-type", "application/json");
                if (request.url === "/oidc/.well-known/openid-configuration") {
                    // Points the token endpoint at another host.
                    response.end(
                        JSON.stringify({
                            token_endpoint: `${loopbackIp}/token`,
                        }),
                    );
                    return;
                }
                const discovery = request.url?.match(
                    /^\/(odd|empty)\/\.well-known\/openid-configuration$/,
                );
                if (discovery) {
                    response.end(
                        JSON.stringify({
                            token_endpoint: `${localhost}/${discovery[1]}/token`,
                        }),
                    );
                    return;
                }
                if (request.url === "/odd/token") {
                    // Not a registered OAuth2 error code.
                    response.writeHead(400);
                    response.end(
                        JSON.stringify({ error: "see http://10.0.0.5/admin" }),
                    );
                    return;
                }
                if (request.url === "/empty/token") {
                    // A success answer without an access token.
                    response.end("{}");
                    return;
                }
                if (request.url?.endsWith("/token")) {
                    response.writeHead(401);
                    response.end(
                        JSON.stringify({
                            error: "invalid_grant",
                            error_description: "upstream detail",
                        }),
                    );
                    return;
                }
                if (request.url === "/registrar/redirect") {
                    response.writeHead(302, {
                        location: "http://169.254.169.254/",
                    });
                    response.end();
                    return;
                }
                response.writeHead(404);
                response.end("{}");
            });
        });
        await new Promise<void>((resolve) =>
            server.listen(0, "127.0.0.1", resolve),
        );
        const { port } = server.address() as AddressInfo;
        localhost = `http://localhost:${port}`;
        loopbackIp = `http://127.0.0.1:${port}`;

        // A port nothing listens on.
        const closed = createServer();
        await new Promise<void>((resolve) =>
            closed.listen(0, "127.0.0.1", resolve),
        );
        closedUrl = `http://127.0.0.1:${(closed.address() as AddressInfo).port}`;
        await new Promise<void>((resolve) => closed.close(() => resolve()));
    });

    afterAll(async () => {
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    beforeEach(() => {
        requests = [];
    });

    const policy = (config: Record<string, unknown> = {}) =>
        new OutboundUrlPolicyService({
            get: vi.fn(
                (key: string, fallback?: unknown) => config[key] ?? fallback,
            ),
        } as never);
    const permissive = () =>
        policy({
            OUTBOUND_URL_ALLOW_HTTP: true,
            OUTBOUND_URL_ALLOW_PRIVATE_NETWORK: true,
        });
    /** Allows the local server only by the name `localhost`. */
    const localhostOnly = () =>
        policy({
            OUTBOUND_URL_ALLOW_HTTP: true,
            OUTBOUND_URL_ALLOW_PRIVATE_NETWORK: true,
            OUTBOUND_URL_ALLOWED_HOSTS: "localhost",
        });
    const service = (
        outboundUrlPolicy: OutboundUrlPolicyService,
        configs: Record<string, object> = {},
    ) =>
        new RegistrarAuthService(
            {
                findOneBy: vi.fn(
                    async ({ tenantId }: { tenantId: string }) =>
                        configs[tenantId] ?? null,
                ),
            } as any,
            outboundUrlPolicy,
            new HttpService(axios.create()),
        );
    const credentials = {
        clientId: "client",
        username: "user",
        password: "password",
    };

    describe("testCredentials", () => {
        it("rejects a blocked OIDC URL without sending a request", async () => {
            await expect(
                service(
                    policy({ OUTBOUND_URL_ALLOW_HTTP: true }),
                ).testCredentials({
                    ...credentials,
                    oidcUrl: `${loopbackIp}/oidc`,
                }),
            ).rejects.toThrow("private or loopback IP");
            expect(requests).toEqual([]);
        });

        it("checks the token endpoint named by the discovery document", async () => {
            const result = service(localhostOnly()).testCredentials({
                ...credentials,
                oidcUrl: `${localhost}/oidc`,
            });

            await expect(result).rejects.toThrow(
                new BadRequestException(
                    `Registrar credentials could not be verified: Request to ${loopbackIp}/token is blocked by the outbound URL policy: Outbound URL host is not in the allowlist`,
                ),
            );
            expect(requests.map(({ url }) => url)).toEqual([
                "/oidc/.well-known/openid-configuration",
            ]);
        });

        it("answers 503 without addresses when the OIDC provider is unreachable", async () => {
            const result = service(permissive()).testCredentials({
                ...credentials,
                oidcUrl: `${closedUrl}/oidc`,
            });

            // The connection error names the address; only the log has it.
            await expect(result).rejects.toThrow(
                new ServiceUnavailableException(
                    `Registrar credentials could not be verified: Request to ${closedUrl}/oidc/.well-known/openid-configuration failed`,
                ),
            );
        });

        it("leaves out an error code that is not registered", async () => {
            const result = service(permissive()).testCredentials({
                ...credentials,
                oidcUrl: `${localhost}/odd`,
            });

            await expect(result).rejects.toThrow(
                new BadRequestException(
                    "Invalid registrar credentials: the OIDC provider answered with HTTP 400. Please check your username, password, client ID and secret.",
                ),
            );
        });

        it("answers 503 when the OIDC provider returns no access token", async () => {
            const result = service(permissive()).testCredentials({
                ...credentials,
                oidcUrl: `${localhost}/empty`,
            });

            await expect(result).rejects.toThrow(
                new ServiceUnavailableException(
                    "Registrar credentials could not be verified: the OIDC provider did not answer with an access token; the server log has the cause",
                ),
            );
        });

        it("names the registered OAuth2 error code of a rejection", async () => {
            const result = service(permissive()).testCredentials({
                ...credentials,
                oidcUrl: `${localhost}/plain`,
            });

            await expect(result).rejects.toThrow(
                new BadRequestException(
                    "Invalid registrar credentials: the OIDC provider answered with HTTP 401, invalid_grant. Please check your username, password, client ID and secret.",
                ),
            );
        });
    });

    describe("token errors of getClient", () => {
        /** The token request of getClient, the path wallets can reach. */
        const accessToken = (
            outboundUrlPolicy: OutboundUrlPolicyService,
            oidcUrl: string,
        ) =>
            service(outboundUrlPolicy, {
                tenant: {
                    tenantId: "tenant",
                    registrarUrl: `${localhost}/registrar`,
                    ...credentials,
                    oidcUrl,
                },
            }).getClient("tenant");

        it("does not pass on the OIDC provider's error description", async () => {
            // No discovery document under this path, so the client falls
            // back to its default token endpoint.
            const result = accessToken(permissive(), `${localhost}/plain`);

            await expect(result).rejects.toThrow(
                new BadRequestException(
                    "Failed to authenticate with registrar: the OIDC provider answered with HTTP 401, invalid_grant",
                ),
            );
        });

        // The message can reach a wallet through the OID4VP request object,
        // so it names no URL.
        it("does not pass on connection errors or URLs", async () => {
            const result = accessToken(permissive(), `${closedUrl}/oidc`);

            await expect(result).rejects.toThrow(
                new BadRequestException(
                    "Failed to authenticate with registrar: the OIDC provider could not be reached",
                ),
            );
        });

        it("does not name a token endpoint that the policy blocks", async () => {
            const result = accessToken(localhostOnly(), `${localhost}/oidc`);

            await expect(result).rejects.toThrow(
                new BadRequestException(
                    "Failed to authenticate with registrar: the outbound URL policy blocks a request to the OIDC provider",
                ),
            );
        });
    });

    describe("getClient", () => {
        it("rejects a blocked registrar URL before requesting a token", async () => {
            const authService = service(
                policy({ OUTBOUND_URL_ALLOW_HTTP: true }),
                {
                    tenant: {
                        ...credentials,
                        registrarUrl: `${loopbackIp}/registrar`,
                        oidcUrl: `${localhost}/oidc`,
                    },
                },
            );
            const getAccessToken = vi.spyOn(
                authService as any,
                "getAccessToken",
            );

            await expect(authService.getClient("tenant")).rejects.toThrow(
                "private or loopback IP",
            );
            expect(getAccessToken).not.toHaveBeenCalled();
            expect(requests).toEqual([]);
        });

        it("sends registrar requests through the outbound URL policy", async () => {
            const authService = service(localhostOnly(), {
                tenant: { registrarUrl: `${localhost}/registrar` },
            });
            vi.spyOn(authService as any, "getAccessToken").mockResolvedValue(
                "token",
            );
            const client = await authService.getClient("tenant");

            const result = await client.get({ url: "/redirect" });

            expect((result.error as Error).message).toBe(
                `Request to ${localhost}/registrar/redirect was redirected to http://169.254.169.254/, which the outbound URL policy blocks: Outbound URL host is not in the allowlist`,
            );
            expect(requests.map(({ url }) => url)).toEqual([
                "/registrar/redirect",
            ]);
        });
    });

    describe("assertSafeUrls", () => {
        it("checks only the URLs that are given", async () => {
            const outboundUrlPolicy = policy();
            const assertSafeUrl = vi
                .spyOn(outboundUrlPolicy, "assertSafeUrl")
                .mockResolvedValue();

            await service(outboundUrlPolicy).assertSafeUrls({
                registrarUrl: "https://registrar.example",
            });

            expect(assertSafeUrl).toHaveBeenCalledTimes(1);
            expect(assertSafeUrl).toHaveBeenCalledWith(
                "https://registrar.example",
                { resolveHost: undefined },
            );
        });

        it("passes on that the hosts are not resolved", async () => {
            const outboundUrlPolicy = policy();
            const assertSafeUrl = vi
                .spyOn(outboundUrlPolicy, "assertSafeUrl")
                .mockResolvedValue();

            await service(outboundUrlPolicy).assertSafeUrls(
                { oidcUrl: "https://auth.example" },
                { resolveHosts: false },
            );

            expect(assertSafeUrl).toHaveBeenCalledWith("https://auth.example", {
                resolveHost: false,
            });
        });

        it("names every rejected field", async () => {
            const result = service(
                policy({ OUTBOUND_URL_ALLOW_HTTP: true }),
            ).assertSafeUrls({
                registrarUrl: `${loopbackIp}/registrar`,
                oidcUrl: "ftp://oidc.example",
            });

            await expect(result).rejects.toBeInstanceOf(BadRequestException);
            const response = (
                (await result.catch((error) => error)) as BadRequestException
            ).getResponse();
            expect(response).toMatchObject({
                message:
                    "Rejected by the outbound URL policy of this instance: registrarUrl: Outbound URL target resolves to a private or loopback IP; oidcUrl: Outbound URL must use HTTPS in this environment",
                errors: [
                    {
                        path: ["registrarUrl"],
                        message:
                            "Outbound URL target resolves to a private or loopback IP",
                        code: "outbound_url_policy",
                    },
                    {
                        path: ["oidcUrl"],
                        message:
                            "Outbound URL must use HTTPS in this environment",
                        code: "outbound_url_policy",
                    },
                ],
            });
        });
    });
});
