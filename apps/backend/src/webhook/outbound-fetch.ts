import type { HttpService } from "@nestjs/axios";
import {
    type AxiosRequestConfig,
    type AxiosResponse,
    isAxiosError,
} from "axios";
import { firstValueFrom } from "rxjs";
import {
    OutboundAddressBlockedError,
    type OutboundUrlPolicyService,
} from "./outbound-url-policy.service.js";

/** Limits of an outbound request. */
export interface OutboundFetchLimits {
    /** Deadline for the whole request: every redirect hop and the body. */
    timeoutMs: number;
    /** Maximum size of one response body. */
    maxBytes: number;
    /** Redirects to follow; without it, every redirect is rejected. */
    maxRedirects?: number;
}

/** Response statuses that the Fetch API does not allow a body for. */
const NULL_BODY_STATUSES = new Set([101, 204, 205, 304]);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/** Request headers that only go to the origin of the original request. */
const CREDENTIAL_HEADERS = ["authorization", "cookie", "proxy-authorization"];

/**
 * Error of an outbound request. It replaces the axios error, which carries
 * the request configuration with its headers and body (for example a bearer
 * token or client secret), because callers log errors as objects. The
 * message names the URL but no addresses; `detail` keeps the cause for the
 * log.
 */
export class OutboundFetchError extends Error {
    readonly detail?: string;
    /** The outbound URL policy refused the URL, a redirect target or the connected address. */
    readonly blocked: boolean;

    constructor(
        message: string,
        options: { detail?: string; blocked?: boolean } = {},
    ) {
        super(message);
        this.name = "OutboundFetchError";
        this.detail = options.detail;
        this.blocked = options.blocked ?? false;
    }

    /** What a logger writes when the error is logged as a value. */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            detail: this.detail,
            blocked: this.blocked,
        };
    }
}

/**
 * Axios options that keep one request under the outbound URL policy: the
 * connection only goes to allowed addresses, axios follows no redirects, and
 * the request is cancelled at the deadline. Any status is returned.
 */
export function policyRequestConfig(
    policy: OutboundUrlPolicyService,
    limits: OutboundFetchLimits,
    signal: AbortSignal,
): AxiosRequestConfig {
    return {
        lookup: policy.safeLookup as never,
        // No connection pooling, so safeLookup checks every connection
        // instead of a socket opened by an earlier request being reused.
        httpAgent: false,
        httpsAgent: false,
        maxRedirects: 0,
        // axios' `timeout` ends when the response headers arrive; the signal
        // also bounds a body that trickles in.
        signal,
        maxContentLength: limits.maxBytes,
        validateStatus: () => true,
    };
}

/**
 * Turns an error of a request sent with {@link policyRequestConfig} into an
 * {@link OutboundFetchError}, so the request configuration is dropped.
 */
export function toOutboundFetchError(
    error: unknown,
    url: string,
    limits: OutboundFetchLimits,
    deadline: AbortSignal,
): Error {
    if (!isAxiosError(error)) {
        return error instanceof Error ? error : new Error(String(error));
    }
    if (deadline.aborted) {
        return new OutboundFetchError(
            `Request to ${url} did not complete within ${limits.timeoutMs / 1000} seconds`,
        );
    }
    if (error.message.startsWith("maxContentLength")) {
        return new OutboundFetchError(
            `Response from ${url} exceeds ${limits.maxBytes} bytes`,
        );
    }
    // The policy's own reason when safeLookup refused the connected address;
    // other network errors name addresses and stay in `detail`.
    if (error.cause instanceof OutboundAddressBlockedError) {
        return new OutboundFetchError(
            `Request to ${url} failed: ${error.message}`,
            { blocked: true },
        );
    }
    return new OutboundFetchError(`Request to ${url} failed`, {
        detail: error.message,
    });
}

/**
 * `fetch` under the outbound URL policy, for HTTP clients that take a fetch
 * implementation: every URL, redirect targets included, is checked, the
 * connection only goes to allowed addresses, and time and response size are
 * bounded. Up to `limits.maxRedirects` redirects are followed; credential
 * headers only go to the origin of the original request, and a request body
 * is never resent to another origin.
 */
export function outboundFetch(
    http: HttpService,
    policy: OutboundUrlPolicyService,
    limits: OutboundFetchLimits,
): typeof fetch {
    const maxRedirects = limits.maxRedirects ?? 0;
    return async (input, init) => {
        // Normalise both call styles, fetch(url, init) and fetch(request), so
        // method, headers and body (including multipart) are taken over.
        const request = new Request(input, init);
        const deadline = AbortSignal.timeout(limits.timeoutMs);
        const signal = AbortSignal.any([request.signal, deadline]);
        const origin = new URL(request.url).origin;
        const first: Hop = {
            url: request.url,
            method: request.method,
            headers: Object.fromEntries(request.headers),
            body: request.body
                ? Buffer.from(await request.arrayBuffer())
                : undefined,
        };

        await policy.assertSafeUrl(first.url).catch((error: Error) => {
            throw new OutboundFetchError(
                `Request to ${first.url} is blocked by the outbound URL policy: ${error.message}`,
                { blocked: true },
            );
        });

        // Recursion instead of a loop: its depth is bounded by maxRedirects.
        const send = async (hop: Hop, redirects: number): Promise<Response> => {
            let response: AxiosResponse<ArrayBuffer>;
            try {
                response = await firstValueFrom(
                    http.request<ArrayBuffer>({
                        ...policyRequestConfig(policy, limits, signal),
                        url: hop.url,
                        method: hop.method,
                        headers: hop.headers,
                        data: hop.body,
                        responseType: "arraybuffer",
                    }),
                );
            } catch (error) {
                if (request.signal.aborted) throw request.signal.reason;
                throw toOutboundFetchError(error, hop.url, limits, deadline);
            }
            if (!REDIRECT_STATUSES.has(response.status)) {
                return toFetchResponse(response);
            }

            const next = redirectHop(hop, response, {
                origin,
                redirects,
                maxRedirects,
            });
            await policy.assertSafeUrl(next.url).catch((error: Error) => {
                throw new OutboundFetchError(
                    `Request to ${hop.url} was redirected to ${next.url}, which the outbound URL policy blocks: ${error.message}`,
                    { blocked: true },
                );
            });
            return send(next, redirects + 1);
        };
        return send(first, 0);
    };
}

/** One request of an {@link outboundFetch}, the first or after a redirect. */
interface Hop {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: Buffer;
}

/**
 * The request that follows a redirect response, or an error when the
 * redirect is not followed. As the Fetch standard does, 303, and 301/302
 * after a POST, continue with a GET without body; credential headers and
 * bodies never go to another origin than `origin`.
 */
function redirectHop(
    hop: Hop,
    response: AxiosResponse<ArrayBuffer>,
    context: { origin: string; redirects: number; maxRedirects: number },
): Hop {
    const location = response.headers.location;
    if (typeof location !== "string") {
        throw new OutboundFetchError(
            `Request to ${hop.url} returned redirect status ${response.status} without a location`,
        );
    }
    const target = URL.parse(location, hop.url)?.toString();
    if (target === undefined) {
        throw new OutboundFetchError(
            `Request to ${hop.url} was redirected to an invalid location`,
        );
    }
    if (context.redirects === context.maxRedirects) {
        const limit =
            context.maxRedirects === 0
                ? "redirects are not followed"
                : `more than ${context.maxRedirects} redirects are not followed`;
        throw new OutboundFetchError(
            `Request to ${hop.url} was redirected to ${target}; ${limit}`,
        );
    }

    let next: Hop = { ...hop, url: target };
    const toGet =
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
            hop.method === "POST");
    if (toGet) {
        next = {
            url: target,
            method: hop.method === "HEAD" ? "HEAD" : "GET",
            headers: withoutHeaders(hop.headers, [
                "content-type",
                "content-length",
            ]),
        };
    }
    if (new URL(target).origin !== context.origin) {
        if (next.body) {
            throw new OutboundFetchError(
                `Request to ${hop.url} was redirected to ${target}; a request body is not resent to another origin`,
            );
        }
        next = {
            ...next,
            headers: withoutHeaders(next.headers, CREDENTIAL_HEADERS),
        };
    }
    return next;
}

function withoutHeaders(
    headers: Record<string, string>,
    names: string[],
): Record<string, string> {
    return Object.fromEntries(
        Object.entries(headers).filter(
            ([name]) => !names.includes(name.toLowerCase()),
        ),
    );
}

function toFetchResponse(response: AxiosResponse<ArrayBuffer>): Response {
    const contentType = response.headers["content-type"];
    return new Response(
        NULL_BODY_STATUSES.has(response.status)
            ? null
            : new Uint8Array(response.data),
        {
            status: response.status,
            statusText: response.statusText,
            headers: contentType
                ? { "content-type": String(contentType) }
                : undefined,
        },
    );
}
