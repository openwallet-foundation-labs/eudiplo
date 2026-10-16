/** Throws unless `value` is an absolute HTTP(S) URL, as config loading requires. */
export function validateHttpUrl(value: string, label: string): void {
    try {
        const url = new URL(value);
        if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new Error("Unsupported URL protocol.");
        }
    } catch {
        throw new Error(`${label} must be an absolute HTTP(S) URL.`);
    }
}

/** True when a URL carries user info such as `user:password@`. */
export function hasUserInfo(value: string): boolean {
    try {
        const url = new URL(value);
        return url.username !== "" || url.password !== "";
    } catch {
        return false;
    }
}

/**
 * Hides user info such as `user:password@` in a URL before it is printed.
 * URLs without user info are returned exactly as configured. The masked form
 * is built from the parsed URL, so spellings the URL parser accepts without
 * `//`, such as `https:user:secret@host`, are masked too. A value that is not
 * a URL is hidden entirely if it could contain user info.
 */
export function redactUrl(value: string): string {
    let url: URL;
    try {
        url = new URL(value);
    } catch {
        return value.includes("@") ? "***" : value;
    }
    if (url.username === "" && url.password === "") {
        return value;
    }
    url.username = "***";
    url.password = "";
    return url.href;
}

/** Returns the URL without user info, for handing it to another program. */
export function stripUserInfo(url: URL): URL {
    const stripped = new URL(url.href);
    stripped.username = "";
    stripped.password = "";
    return stripped;
}

/**
 * Describes a failed request without the user info of its URL. Node's fetch
 * repeats the full URL in some errors, for example "Request cannot be
 * constructed from a URL that includes credentials: <url>".
 */
export function describeRequestError(error: unknown, url: URL): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.replaceAll(url.href, redactUrl(url.href));
}
