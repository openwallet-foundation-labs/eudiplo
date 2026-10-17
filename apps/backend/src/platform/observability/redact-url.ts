import { ATTR_URL_PATH } from "@opentelemetry/semantic-conventions";

/**
 * Query parameters whose values never reach logs or traces. The session
 * search `q` can hold a pre-authorized code or a whole credential offer;
 * `issuer_state`, `request_uri`, `code` and `response_code` let a wallet
 * continue an offer or an authorization.
 */
export const REDACTED_QUERY_PARAMETERS: readonly string[] = [
    "q",
    "issuer_state",
    "request_uri",
    "code",
    "response_code",
];

const REDACTED = "[redacted]";

/**
 * Wallet-facing routes whose path carries a value the wallet continues its
 * flow with: the session's `walletNonce` (fetch the credential offer, answer
 * the presentation request) or the interactive authorization's
 * `auth_session`. Group 1 is the part kept before the value.
 */
const WALLET_REFERENCE_PATHS: readonly RegExp[] = [
    /^(\/issuers\/[^/?#]+\/vci\/credential-offers\/)[^/?#]+/,
    /^(\/issuers\/[^/?#]+\/authorize\/interactive\/complete-web-auth\/)[^/?#]+/,
    /^(\/presentations\/)[^/?#]+(?=\/(?:oid4vp|iso-18013-7)(?:[/?#]|$))/,
];

/**
 * The URL with wallet references in the path and the values of
 * {@link REDACTED_QUERY_PARAMETERS} replaced. Everything else, including the
 * encoding of other parameters, is kept as is.
 */
export function redactUrl(url: string): string;
export function redactUrl(url: string | undefined): string | undefined;
export function redactUrl(url: string | undefined): string | undefined {
    if (!url) return url;
    return redactQuery(redactUrlPath(url));
}

/** The URL with wallet references in the path replaced; the query is kept. */
export function redactUrlPath(url: string): string {
    for (const pattern of WALLET_REFERENCE_PATHS) {
        if (pattern.test(url)) {
            return url.replace(pattern, `$1${REDACTED}`);
        }
    }
    return url;
}

/**
 * HTTP instrumentation request hook: replaces wallet references in the
 * `url.path` attribute of server spans. Client requests have no `url`.
 */
export function redactSpanUrlPath(
    span: { setAttribute(key: string, value: string): unknown },
    request: object,
): void {
    const url = (request as { url?: unknown }).url;
    if (typeof url !== "string" || !url) return;
    const path = url.split(/[?#]/, 1)[0];
    const redacted = redactUrlPath(path);
    if (redacted !== path) {
        span.setAttribute(ATTR_URL_PATH, redacted);
    }
}

function redactQuery(url: string): string {
    const start = url.indexOf("?");
    if (start < 0) return url;
    const end = url.indexOf("#", start);
    const query = url.slice(start + 1, end < 0 ? undefined : end);
    const redacted = query
        .split("&")
        .map((pair) => {
            const separator = pair.indexOf("=");
            const name = separator < 0 ? pair : pair.slice(0, separator);
            return REDACTED_QUERY_PARAMETERS.includes(decodeName(name))
                ? `${name}=${REDACTED}`
                : pair;
        })
        .join("&");
    return `${url.slice(0, start + 1)}${redacted}${end < 0 ? "" : url.slice(end)}`;
}

function decodeName(name: string): string {
    try {
        return decodeURIComponent(name.replaceAll("+", " "));
    } catch {
        return name;
    }
}
