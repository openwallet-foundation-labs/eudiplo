/**
 * `trust_mark_type` claim of a trust mark JWT, which its `trust_marks` entry
 * in an entity configuration must repeat (OpenID Federation Section 7.1);
 * `undefined` when the JWT has none or cannot be decoded.
 */
export function trustMarkType(jwt: string): string | undefined {
    const payload = jwt.split(".")[1];
    try {
        const claims: unknown = JSON.parse(
            Buffer.from(payload ?? "", "base64url").toString(),
        );
        const type = (claims as { trust_mark_type?: unknown } | null)
            ?.trust_mark_type;
        return typeof type === "string" && type ? type : undefined;
    } catch {
        return undefined;
    }
}
