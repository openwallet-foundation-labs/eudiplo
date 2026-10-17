import type { JWK } from "jose";

/**
 * JWK members a published public key may carry: identification, intended
 * use and the public parameters of EC (x, y), OKP (x) and RSA (n, e) keys.
 */
const PUBLIC_JWK_MEMBERS = [
    "kty",
    "alg",
    "kid",
    "use",
    "crv",
    "x",
    "y",
    "n",
    "e",
] as const;

/**
 * Copies only the public members of `jwk`, so private members (`d`, RSA
 * primes, `oth`, `k`) or unknown members of an imported key can never reach
 * published metadata.
 */
export function toPublicJwk(jwk: JWK): JWK {
    const source = jwk as Record<string, unknown>;
    const publicJwk: Record<string, string> = {};
    for (const member of PUBLIC_JWK_MEMBERS) {
        const value = source[member];
        if (typeof value === "string") publicJwk[member] = value;
    }
    return publicJwk as JWK;
}
