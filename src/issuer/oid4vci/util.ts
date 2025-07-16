import type { Request } from 'express';

export function getHeadersFromRequest(req: Request): globalThis.Headers {
    const headers = new Headers();

    for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) {
            for (const v of value) {
                headers.append(key, v);
            }
        } else if (value !== undefined) {
            headers.set(key, value);
        }
    }

    return headers;
}
