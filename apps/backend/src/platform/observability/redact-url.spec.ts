import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Writable } from "node:stream";
import type { ConfigService } from "@nestjs/config";
import { pinoHttp } from "pino-http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLoggerOptions } from "./logger.factory.js";
import { redactSpanUrlPath, redactUrl, redactUrlPath } from "./redact-url.js";

const CODE = "DEMO_PREAUTH_CODE";

describe("redactUrl", () => {
    it.each([
        ["/api/session?q=secret", "/api/session?q=[redacted]"],
        [
            "/api/session?status=failed&q=secret&page=2",
            "/api/session?status=failed&q=[redacted]&page=2",
        ],
        ["/api/session?q=a&q=b", "/api/session?q=[redacted]&q=[redacted]"],
        ["/api/session?%71=secret", "/api/session?%71=[redacted]"],
        ["/api/session?q", "/api/session?q=[redacted]"],
        ["/api/session?q=secret#top", "/api/session?q=[redacted]#top"],
        ["/api/session?query=kept&aq=kept", "/api/session?query=kept&aq=kept"],
        ["/api/session", "/api/session"],
        ["/api/session?q=%E0%A4%A", "/api/session?q=[redacted]"],
        [
            "/issuers/t1/vci/credential-offers/nonce-1",
            "/issuers/t1/vci/credential-offers/[redacted]",
        ],
        [
            "/issuers/t1/vci/credential-offers/nonce-1?x=1",
            "/issuers/t1/vci/credential-offers/[redacted]?x=1",
        ],
        ["/presentations/nonce-1/oid4vp", "/presentations/[redacted]/oid4vp"],
        [
            "/presentations/nonce-1/oid4vp/request/no-redirect",
            "/presentations/[redacted]/oid4vp/request/no-redirect",
        ],
        [
            "/presentations/nonce-1/iso-18013-7",
            "/presentations/[redacted]/iso-18013-7",
        ],
        [
            "/issuers/t1/authorize?client_id=w&issuer_state=s&request_uri=urn:x",
            "/issuers/t1/authorize?client_id=w&issuer_state=[redacted]&request_uri=[redacted]",
        ],
        [
            "/issuers/t1/authorization-servers/as/vp-callback?cas=c&response_code=r",
            "/issuers/t1/authorization-servers/as/vp-callback?cas=c&response_code=[redacted]",
        ],
        [
            "/issuers/t1/chained-as/callback?code=c&state=s",
            "/issuers/t1/chained-as/callback?code=[redacted]&state=s",
        ],
        ["/presentations/nonce-1/other", "/presentations/nonce-1/other"],
        [
            "/api/presentations/nonce-1/oid4vp",
            "/api/presentations/nonce-1/oid4vp",
        ],
    ])("%s → %s", (url, expected) => {
        expect(redactUrl(url)).toBe(expected);
    });

    it("redacts the auth_session of the web step completion", () => {
        expect(
            redactUrl("/issuers/t1/authorize/interactive/complete-web-auth/a1"),
        ).toBe(
            "/issuers/t1/authorize/interactive/complete-web-auth/[redacted]",
        );
    });

    it("redacts only the path for span attributes", () => {
        expect(redactUrlPath("/presentations/n1/oid4vp?code=c")).toBe(
            "/presentations/[redacted]/oid4vp?code=c",
        );
        expect(redactUrlPath("/api/session")).toBe("/api/session");
    });

    it("replaces wallet references in the url.path span attribute", () => {
        const setAttribute = vi.fn();
        redactSpanUrlPath(
            { setAttribute },
            { url: "/presentations/n1/oid4vp?x=1" },
        );
        expect(setAttribute).toHaveBeenCalledExactlyOnceWith(
            "url.path",
            "/presentations/[redacted]/oid4vp",
        );

        setAttribute.mockClear();
        redactSpanUrlPath({ setAttribute }, { url: "/api/session" });
        redactSpanUrlPath(
            { setAttribute },
            { path: "/presentations/n1/oid4vp" },
        );
        expect(setAttribute).not.toHaveBeenCalled();
    });

    it("leaves an absent URL absent", () => {
        expect(redactUrl(undefined)).toBeUndefined();
    });
});

describe("HTTP logging of the session search and wallet references", () => {
    let server: Server | undefined;

    afterEach(() => {
        server?.close();
        server = undefined;
    });

    /** Run requests through the production pino-http options and collect the log lines. */
    async function logsOf(paths: string[]): Promise<string[]> {
        const settings: Record<string, unknown> = {
            LOG_ENABLE_HTTP_LOGGER: true,
            LOG_HTTP_RESPONSE_BODY: false,
            LOG_TO_FILE: false,
            LOG_FILE_PATH: "",
            LOG_HTTP_RESPONSE_BODY_MAX_LENGTH: 0,
            LOG_REDACT_SENSITIVE_DATA: true,
            OTEL_SDK_DISABLED: true,
            LOG_LEVEL: "debug",
        };
        const config = {
            getOrThrow: (key: string) => settings[key],
            get: () => undefined,
        } as unknown as ConfigService;
        const { transport: _transport, ...options } = (
            createLoggerOptions(config) as { pinoHttp: Record<string, any> }
        ).pinoHttp;
        const lines: string[] = [];
        const logging = pinoHttp(
            options,
            new Writable({
                write(chunk, _encoding, done) {
                    lines.push(chunk.toString());
                    done();
                },
            }),
        );
        server = createServer((req, res) => {
            logging(req, res);
            // A request-scoped error log, as the exception filter writes it.
            req.log.error("request failed");
            res.statusCode = 400;
            res.end();
        });
        await new Promise<void>((resolve) =>
            server!.listen(0, "127.0.0.1", resolve),
        );
        const { port } = server.address() as AddressInfo;
        for (const path of paths)
            await fetch(`http://127.0.0.1:${port}${path}`);
        return lines;
    }

    it("never logs the search term, in error logs or access logs", async () => {
        const offer = `openid-credential-offer://?credential_offer=${encodeURIComponent(
            JSON.stringify({
                grants: {
                    "urn:ietf:params:oauth:grant-type:pre-authorized_code": {
                        "pre-authorized_code": CODE,
                    },
                },
            }),
        )}`;
        const lines = await logsOf([
            // Management API: excluded from access logs, not from error logs.
            `/api/session?status=failed&q=${CODE}`,
            `/api/session?q=${encodeURIComponent(offer)}`,
            // A logged path, so the access log messages are covered too.
            `/session?q=${CODE}`,
        ]);

        const parsed = lines.map((line) => JSON.parse(line));
        const messages = parsed.map((line) => line.msg as string);
        expect(messages.filter((msg) => msg === "request failed")).toHaveLength(
            3,
        );
        expect(messages).toContain("--> GET /session?q=[redacted]");
        expect(messages).toContainEqual(
            expect.stringMatching(/^<-- GET \/session\?q=\[redacted\] 400 /),
        );
        expect(parsed[0].req.url).toBe(
            "/api/session?status=failed&q=[redacted]",
        );
        expect(lines.join("\n")).not.toContain(CODE);
        expect(lines.join("\n")).not.toContain("pre-authorized_code");
    });

    it("never logs a wallet reference from the path", async () => {
        const nonce = "WALLET_NONCE_VALUE";
        const lines = await logsOf([
            `/issuers/t1/vci/credential-offers/${nonce}`,
            `/presentations/${nonce}/oid4vp/request`,
            `/presentations/${nonce}/iso-18013-7`,
        ]);

        const parsed = lines.map((line) => JSON.parse(line));
        expect(parsed.map((line) => line.msg)).toContain(
            "--> GET /presentations/[redacted]/iso-18013-7",
        );
        expect(parsed.map((line) => line.req?.url)).toContain(
            "/issuers/t1/vci/credential-offers/[redacted]",
        );
        expect(lines.join("\n")).not.toContain(nonce);
    });
});
