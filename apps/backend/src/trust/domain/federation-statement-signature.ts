import {
    compactVerify,
    decodeJwt,
    decodeProtectedHeader,
    importJWK,
    type JWK,
} from "jose";

/** Signature algorithms accepted for federation entity statements. */
export const FEDERATION_ALGORITHMS = [
    "ES256",
    "ES384",
    "ES512",
    "PS256",
    "PS384",
    "PS512",
    "RS256",
    "RS384",
    "RS512",
    "EdDSA",
];

/** Whether `jwt` is signed with `jwk` using an accepted algorithm. */
async function isSignedWith(jwt: string, jwk: JWK): Promise<boolean> {
    try {
        const { alg } = decodeProtectedHeader(jwt);
        if (typeof alg !== "string" || !FEDERATION_ALGORITHMS.includes(alg)) {
            return false;
        }
        await compactVerify(jwt, await importJWK(jwk, alg), {
            algorithms: [alg],
        });
        return true;
    } catch {
        return false;
    }
}

/**
 * Why the entity configuration `jwt` of trust anchor `entityId` is not
 * acceptable under its pinned `keys`, or `undefined` when it is: it must be
 * self-issued by `entityId` and signed with the pinned key its `kid` names
 * (OpenID Federation 1.0 Section 10.2).
 */
export async function pinnedTrustAnchorMismatch(
    jwt: string | undefined,
    entityId: string,
    keys: JWK[],
): Promise<string | undefined> {
    if (!jwt) return `no entity configuration of trust anchor ${entityId}`;
    let kid: unknown;
    let iss: unknown;
    let sub: unknown;
    try {
        kid = decodeProtectedHeader(jwt).kid;
        ({ iss, sub } = decodeJwt(jwt));
    } catch {
        return `entity configuration of trust anchor ${entityId} is not a JWT`;
    }
    if (iss !== entityId || sub !== entityId) {
        return `last statement of the chain is not the entity configuration of trust anchor ${entityId}`;
    }
    const key = keys.find((candidate) => candidate.kid === kid);
    if (!key || !(await isSignedWith(jwt, key))) {
        return `entity configuration of trust anchor ${entityId} is not signed with a pinned key`;
    }
    return undefined;
}
