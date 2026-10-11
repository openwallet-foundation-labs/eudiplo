import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { HttpService } from "@nestjs/axios";
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
import { OutboundFetchError, outboundFetch } from "./outbound-fetch.js";
import { OutboundUrlPolicyService } from "./outbound-url-policy.service.js";

/** Real requests against a local server through the outbound URL policy. */
describe("outboundFetch", () => {
    let server: Server;
    let localhost: string;
    let loopbackIp: string;
    let closedUrl: string;
    let requests: {
        method?: string;
        url?: string;
        contentType?: string;
        authorization?: string;
        cookie?: string;
        proxyAuthorization?: string;
        body: string;
    }[];

    beforeAll(async () => {
        server = createServer((request, response) => {
            let body = "";
            request.on("data", (chunk) => {
                body += chunk;
            });
            request.on("end", () => {
                requests.push({
                    method: request.method,
                    url: request.url,
                    contentType: request.headers["content-type"],
                    authorization: request.headers.authorization,
                    cookie: request.headers.cookie,
                    proxyAuthorization: request.headers["proxy-authorization"],
                    body,
                });
                switch (request.url) {
                    case "/redirect":
                        response.writeHead(302, {
                            location: "http://169.254.169.254/latest",
                        });
                        response.end();
                        return;
                    case "/redirect-same-origin":
                        response.writeHead(302, { location: "/ok" });
                        response.end();
                        return;
                    case "/redirect-other-origin":
                        response.writeHead(302, {
                            location: `${loopbackIp}/ok`,
                        });
                        response.end();
                        return;
                    case "/redirect-307-other-origin":
                        response.writeHead(307, {
                            location: `${loopbackIp}/ok`,
                        });
                        response.end();
                        return;
                    case "/redirect-307-same-origin":
                        response.writeHead(307, { location: "/ok" });
                        response.end();
                        return;
                    case "/redirect-invalid":
                        response.writeHead(302, { location: "http://[" });
                        response.end();
                        return;
                    case "/redirect-303":
                        response.writeHead(303, { location: "/ok" });
                        response.end();
                        return;
                    case "/redirect-loop":
                        response.writeHead(302, { location: "/redirect-loop" });
                        response.end();
                        return;
                    case "/redirect-without-location":
                        response.writeHead(302);
                        response.end();
                        return;
                    case "/not-modified":
                        response.writeHead(304);
                        response.end();
                        return;
                    case "/trickle": {
                        // Headers at once, then a byte now and then; each
                        // byte resets a socket idle timeout.
                        response.writeHead(200);
                        const timer = setInterval(
                            () => response.write("x"),
                            20,
                        );
                        response.on("close", () => clearInterval(timer));
                        return;
                    }
                    case "/empty":
                        response.writeHead(204);
                        response.end();
                        return;
                    case "/large":
                        response.end("x".repeat(2048));
                        return;
                    case "/slow":
                        // Never answers; the client times out.
                        return;
                    default:
                        response.setHeader("content-type", "application/json");
                        response.end(JSON.stringify({ ok: true }));
                }
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
        server.closeAllConnections();
        await new Promise<void>((resolve) => server.close(() => resolve()));
    });

    beforeEach(() => {
        requests = [];
    });

    /** Policy with the 9.0 defaults: HTTPS only, no private addresses. */
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
    const http = new HttpService(axios.create());
    const limits = { timeoutMs: 2_000, maxBytes: 1024 };
    const fetchWith = (outboundUrlPolicy: OutboundUrlPolicyService) =>
        outboundFetch(http, outboundUrlPolicy, limits);

    it("applies the outbound URL policy before sending", async () => {
        await expect(fetchWith(policy())(`${loopbackIp}/ok`)).rejects.toThrow(
            "must use HTTPS",
        );
        await expect(
            fetchWith(policy({ OUTBOUND_URL_ALLOW_HTTP: true }))(
                `${loopbackIp}/ok`,
            ),
        ).rejects.toThrow("private or loopback IP");
        expect(requests).toEqual([]);
    });

    it("checks the connected address (DNS rebinding)", async () => {
        const outboundUrlPolicy = policy({ OUTBOUND_URL_ALLOW_HTTP: true });
        // A hostname that passed the up-front check with a public address
        // and resolves to a private one when connecting.
        vi.spyOn(outboundUrlPolicy, "assertSafeUrl").mockResolvedValue();
        await expect(
            fetchWith(outboundUrlPolicy)(`${localhost}/ok`),
        ).rejects.toMatchObject({
            message: `Request to ${localhost}/ok failed: Outbound URL target resolves to a private or loopback IP`,
            blocked: true,
        });
        expect(requests).toEqual([]);
    });

    it("keeps method, headers and body of a Request", async () => {
        // The generated registrar client calls fetch(request) without init.
        const response = await fetchWith(permissive())(
            new Request(`${localhost}/ok`, {
                method: "PUT",
                headers: {
                    authorization: "Bearer token",
                    "content-type": "application/json",
                },
                body: JSON.stringify({ name: "value" }),
            }),
        );

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toEqual({ ok: true });
        expect(requests).toEqual([
            {
                method: "PUT",
                url: "/ok",
                contentType: "application/json",
                authorization: "Bearer token",
                body: '{"name":"value"}',
            },
        ]);
    });

    it("sends multipart bodies of a Request", async () => {
        // The generated registrar client builds a Request with FormData and
        // calls fetch(request) without init.
        const form = new FormData();
        form.append("schema", "{}");
        form.append("file", new Blob(["file content"]), "file.txt");

        await fetchWith(permissive())(
            new Request(`${localhost}/ok`, { method: "POST", body: form }),
        );

        expect(requests[0].contentType).toMatch(
            /^multipart\/form-data; boundary=/,
        );
        expect(requests[0].body).toContain("file content");
    });

    it("sends multipart bodies", async () => {
        const form = new FormData();
        form.append("schema", "{}");
        form.append("file", new Blob(["file content"]), "file.txt");

        await fetchWith(permissive())(`${localhost}/ok`, {
            method: "POST",
            body: form,
        });

        expect(requests[0].contentType).toMatch(
            /^multipart\/form-data; boundary=/,
        );
        expect(requests[0].body).toContain('name="schema"');
        expect(requests[0].body).toContain("file content");
    });

    it("rejects redirects and names the target", async () => {
        await expect(
            fetchWith(permissive())(`${localhost}/redirect`),
        ).rejects.toThrow(
            `Request to ${localhost}/redirect was redirected to http://169.254.169.254/latest; redirects are not followed`,
        );
        expect(requests.map(({ url }) => url)).toEqual(["/redirect"]);
    });

    it("names a relative redirect target as an absolute URL", async () => {
        await expect(
            fetchWith(permissive())(`${localhost}/redirect-same-origin`),
        ).rejects.toThrow(
            `Request to ${localhost}/redirect-same-origin was redirected to ${localhost}/ok; redirects are not followed`,
        );
    });

    it("rejects a redirect without a location", async () => {
        await expect(
            fetchWith(permissive())(`${localhost}/redirect-without-location`),
        ).rejects.toThrow("returned redirect status 302 without a location");
    });

    it("rejects a redirect to an invalid location", async () => {
        await expect(
            fetchWith(permissive())(`${localhost}/redirect-invalid`),
        ).rejects.toThrow(
            `Request to ${localhost}/redirect-invalid was redirected to an invalid location`,
        );
    });

    it("returns 304 instead of treating it as a redirect", async () => {
        const response = await fetchWith(permissive())(
            `${localhost}/not-modified`,
        );
        expect(response.status).toBe(304);
        await expect(response.text()).resolves.toBe("");
    });

    describe("with redirects allowed", () => {
        const following = (outboundUrlPolicy: OutboundUrlPolicyService) =>
            outboundFetch(http, outboundUrlPolicy, {
                ...limits,
                maxRedirects: 2,
            });
        const authorized = { headers: { authorization: "Bearer token" } };

        it("keeps credentials on the same origin", async () => {
            const response = await following(permissive())(
                `${localhost}/redirect-same-origin`,
                authorized,
            );

            expect(response.status).toBe(200);
            expect(requests).toMatchObject([
                { url: "/redirect-same-origin", authorization: "Bearer token" },
                { url: "/ok", authorization: "Bearer token" },
            ]);
        });

        it("drops credentials on another origin", async () => {
            const response = await following(permissive())(
                `${localhost}/redirect-other-origin`,
                authorized,
            );

            expect(response.status).toBe(200);
            expect(requests).toMatchObject([
                {
                    url: "/redirect-other-origin",
                    authorization: "Bearer token",
                },
                { url: "/ok", authorization: undefined },
            ]);
        });

        it("sends neither body nor credentials to another origin after a 302 POST", async () => {
            await following(permissive())(
                `${localhost}/redirect-other-origin`,
                {
                    method: "POST",
                    headers: {
                        authorization: "Basic client",
                        cookie: "session=1",
                        "proxy-authorization": "Basic proxy",
                        "content-type": "application/x-www-form-urlencoded",
                    },
                    body: "password=secret",
                },
            );

            expect(requests[1]).toEqual({
                method: "GET",
                url: "/ok",
                contentType: undefined,
                authorization: undefined,
                cookie: undefined,
                proxyAuthorization: undefined,
                body: "",
            });
        });

        it("does not resend a body to another origin", async () => {
            await expect(
                following(permissive())(
                    `${localhost}/redirect-307-other-origin`,
                    { method: "POST", body: "password=secret" },
                ),
            ).rejects.toThrow(
                `Request to ${localhost}/redirect-307-other-origin was redirected to ${loopbackIp}/ok; a request body is not resent to another origin`,
            );
            expect(requests.map(({ url }) => url)).toEqual([
                "/redirect-307-other-origin",
            ]);
        });

        it("resends method, body and credentials on the same origin for 307", async () => {
            await following(permissive())(
                `${localhost}/redirect-307-same-origin`,
                {
                    method: "POST",
                    headers: { authorization: "Bearer token" },
                    body: "data",
                },
            );

            expect(requests).toMatchObject([
                { method: "POST", body: "data" },
                {
                    method: "POST",
                    url: "/ok",
                    body: "data",
                    authorization: "Bearer token",
                },
            ]);
        });

        it("continues a 302 after a POST with a GET without body", async () => {
            await following(permissive())(`${localhost}/redirect-same-origin`, {
                method: "POST",
                body: "data",
            });

            expect(requests).toMatchObject([
                { method: "POST", body: "data" },
                { method: "GET", url: "/ok", body: "" },
            ]);
        });

        it("continues a 303 with a GET without body", async () => {
            await following(permissive())(`${localhost}/redirect-303`, {
                method: "POST",
                headers: { "content-type": "text/plain" },
                body: "data",
            });

            expect(requests).toMatchObject([
                { method: "POST", body: "data" },
                { method: "GET", url: "/ok", contentType: undefined, body: "" },
            ]);
        });

        it("checks every redirect target against the policy", async () => {
            const outboundUrlPolicy = policy({
                OUTBOUND_URL_ALLOW_HTTP: true,
                OUTBOUND_URL_ALLOW_PRIVATE_NETWORK: true,
                OUTBOUND_URL_ALLOWED_HOSTS: "localhost",
            });

            await expect(
                following(outboundUrlPolicy)(
                    `${localhost}/redirect-other-origin`,
                ),
            ).rejects.toThrow(
                `Request to ${localhost}/redirect-other-origin was redirected to ${loopbackIp}/ok, which the outbound URL policy blocks: Outbound URL host is not in the allowlist`,
            );
            expect(requests.map(({ url }) => url)).toEqual([
                "/redirect-other-origin",
            ]);
        });

        it("stops after the redirect limit", async () => {
            await expect(
                following(permissive())(`${localhost}/redirect-loop`),
            ).rejects.toThrow("more than 2 redirects are not followed");
            expect(requests).toHaveLength(3);
        });
    });

    it("returns an empty body for 204", async () => {
        const response = await fetchWith(permissive())(`${localhost}/empty`);
        expect(response.status).toBe(204);
        await expect(response.text()).resolves.toBe("");
    });

    it("bounds the response size", async () => {
        await expect(
            fetchWith(permissive())(`${localhost}/large`),
        ).rejects.toThrow(
            new OutboundFetchError(
                `Response from ${localhost}/large exceeds 1024 bytes`,
            ),
        );
    });

    it("bounds the time", async () => {
        await expect(
            outboundFetch(http, permissive(), {
                timeoutMs: 100,
                maxBytes: 1024,
            })(`${localhost}/slow`),
        ).rejects.toThrow(
            `Request to ${localhost}/slow did not complete within 0.1 seconds`,
        );
    });

    it("bounds the time of a body that trickles in", async () => {
        await expect(
            outboundFetch(http, permissive(), {
                timeoutMs: 200,
                maxBytes: 1024 * 1024,
            })(`${localhost}/trickle`),
        ).rejects.toThrow("did not complete within 0.2 seconds");
    });

    it("stops a running request when the caller aborts", {
        timeout: 2_000,
    }, async () => {
        const controller = new AbortController();
        // A deadline far beyond the test timeout: only the caller's signal
        // can end the request in time.
        const result = outboundFetch(http, permissive(), {
            timeoutMs: 60_000,
            maxBytes: 1024,
        })(`${localhost}/slow`, { signal: controller.signal });
        await vi.waitFor(() => expect(requests).toHaveLength(1));
        controller.abort(new Error("aborted by caller"));

        await expect(result).rejects.toThrow("aborted by caller");
    });

    it("keeps request headers out of errors", async () => {
        // Callers log errors as objects; the axios error would carry the
        // request configuration with the bearer token.
        const error = await fetchWith(permissive())(`${closedUrl}/ok`, {
            headers: { authorization: "Bearer secret-token" },
        }).catch((caught: unknown) => caught);

        expect(error).toBeInstanceOf(OutboundFetchError);
        expect((error as OutboundFetchError).message).toBe(
            `Request to ${closedUrl}/ok failed`,
        );
        expect((error as OutboundFetchError).detail).toContain("ECONNREFUSED");
        expect(Object.keys(error as object)).not.toContain("config");
        expect(JSON.stringify(error)).not.toContain("secret-token");
    });
});
