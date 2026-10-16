import type { JWK } from "jose";

/**
 * ECDSA signing algorithms EUDIPLO can create and sign with. In JOSE every
 * one of them is bound to exactly one curve (RFC 7518 §3.4), so the
 * algorithm of a key follows from its `crv` and vice versa.
 */
export const KMS_SIGNING_ALGS = ["ES256", "ES384", "ES512"] as const;

export type KmsSigningAlg = (typeof KMS_SIGNING_ALGS)[number];

/** Algorithm used when neither the caller nor the provider names one. */
export const DEFAULT_SIGNING_ALG: KmsSigningAlg = "ES256";

export interface SigningAlgSpec {
    alg: KmsSigningAlg;
    /** JWK `crv` and WebCrypto `namedCurve`. */
    crv: "P-256" | "P-384" | "P-521";
    /** WebCrypto hash name. */
    hash: "SHA-256" | "SHA-384" | "SHA-512";
    /** Node.js `createHash` name. */
    nodeHash: "sha256" | "sha384" | "sha512";
    /** Size in bytes of one curve coordinate; a raw signature is twice this. */
    coordinateSize: number;
    /** DER-encoded named-curve OID, as used in PKCS#11 `CKA_EC_PARAMS`. */
    curveOidDer: Uint8Array;
    /** OID of the hash algorithm (CSC `hashAlgorithmOID`). */
    hashOid: string;
    /** OID of ecdsa-with-SHAxxx (CSC `signAlgo`). */
    signatureOid: string;
    /** Classic COSE algorithm identifier (RFC 9053). */
    coseAlg: number;
}

export const SIGNING_ALG_SPECS: Readonly<
    Record<KmsSigningAlg, SigningAlgSpec>
> = {
    ES256: {
        alg: "ES256",
        crv: "P-256",
        hash: "SHA-256",
        nodeHash: "sha256",
        coordinateSize: 32,
        // 1.2.840.10045.3.1.7 (prime256v1)
        curveOidDer: Uint8Array.from([
            0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
        ]),
        hashOid: "2.16.840.1.101.3.4.2.1",
        signatureOid: "1.2.840.10045.4.3.2",
        coseAlg: -7,
    },
    ES384: {
        alg: "ES384",
        crv: "P-384",
        hash: "SHA-384",
        nodeHash: "sha384",
        coordinateSize: 48,
        // 1.3.132.0.34 (secp384r1)
        curveOidDer: Uint8Array.from([
            0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x22,
        ]),
        hashOid: "2.16.840.1.101.3.4.2.2",
        signatureOid: "1.2.840.10045.4.3.3",
        coseAlg: -35,
    },
    ES512: {
        alg: "ES512",
        crv: "P-521",
        hash: "SHA-512",
        nodeHash: "sha512",
        coordinateSize: 66,
        // 1.3.132.0.35 (secp521r1)
        curveOidDer: Uint8Array.from([
            0x06, 0x05, 0x2b, 0x81, 0x04, 0x00, 0x23,
        ]),
        hashOid: "2.16.840.1.101.3.4.2.3",
        signatureOid: "1.2.840.10045.4.3.4",
        coseAlg: -36,
    },
};

function isKmsSigningAlg(value: unknown): value is KmsSigningAlg {
    return (
        typeof value === "string" &&
        (KMS_SIGNING_ALGS as readonly string[]).includes(value)
    );
}

/** Throws unless `alg` is one of {@link KMS_SIGNING_ALGS}. */
export function assertKmsSigningAlg(
    alg: unknown,
    context: string,
): asserts alg is KmsSigningAlg {
    if (!isKmsSigningAlg(alg)) {
        throw new Error(`${context}: unsupported alg '${String(alg)}'`);
    }
}

export function signingAlgSpec(alg: KmsSigningAlg): SigningAlgSpec {
    const spec = SIGNING_ALG_SPECS[alg];
    if (!spec) {
        throw new Error(`Unsupported signing algorithm '${String(alg)}'`);
    }
    return spec;
}

/** The algorithm bound to an EC curve, or undefined for other curves. */
export function signingAlgForCurve(
    crv: string | undefined,
): KmsSigningAlg | undefined {
    return KMS_SIGNING_ALGS.find((alg) => SIGNING_ALG_SPECS[alg].crv === crv);
}

/**
 * The signing algorithm of a JWK, taken from its curve. Throws when the key
 * is not an EC key on a supported curve, or when its `alg` member names a
 * different algorithm than the curve allows.
 */
export function signingAlgForJwk(jwk: JWK): KmsSigningAlg {
    const alg = jwk.kty === "EC" ? signingAlgForCurve(jwk.crv) : undefined;
    if (!alg) {
        throw new Error(
            `Unsupported key: expected an EC key on ${KMS_SIGNING_ALGS.map((a) => SIGNING_ALG_SPECS[a].crv).join(", ")}, got kty '${String(jwk.kty)}' crv '${String(jwk.crv)}'`,
        );
    }
    if (jwk.alg !== undefined && jwk.alg !== alg) {
        throw new Error(
            `Key alg '${jwk.alg}' does not match its curve ${String(jwk.crv)} (expected ${alg})`,
        );
    }
    return alg;
}

/** The `algorithms` / `defaultAlgorithm` members of a `kms.json` provider entry. */
export interface KmsAlgorithmPolicy {
    algorithms?: readonly KmsSigningAlg[];
    defaultAlgorithm?: KmsSigningAlg;
}

/**
 * Policy for providers whose backend may not support every curve (PKCS#11
 * tokens, CSC credentials, remote HTTP services): without `algorithms` in
 * `kms.json` only the default algorithm (ES256 unless configured) is
 * offered for new keys.
 */
export function externalAlgorithmPolicy(
    configured?: KmsAlgorithmPolicy,
): KmsAlgorithmPolicy {
    return {
        algorithms: configured?.algorithms ?? [
            configured?.defaultAlgorithm ?? DEFAULT_SIGNING_ALG,
        ],
        defaultAlgorithm: configured?.defaultAlgorithm,
    };
}

/**
 * Narrow what an adapter can do to what an operator allowed in `kms.json`.
 *
 * @param adapterAlgs algorithms the adapter type can generate keys for
 * @param configured optional `algorithms` and `defaultAlgorithm` of the provider entry
 */
export function resolveAlgorithmCapabilities(
    adapterAlgs: readonly KmsSigningAlg[],
    configured?: KmsAlgorithmPolicy,
): { supportedAlgs: KmsSigningAlg[]; defaultAlg: KmsSigningAlg } {
    const supportedAlgs = configured?.algorithms
        ? adapterAlgs.filter((alg) => configured.algorithms!.includes(alg))
        : [...adapterAlgs];
    if (supportedAlgs.length === 0) {
        throw new Error(
            `None of the configured algorithms (${configured?.algorithms?.join(", ")}) is supported by this provider type (${adapterAlgs.join(", ")})`,
        );
    }
    const defaultAlg =
        configured?.defaultAlgorithm ??
        (supportedAlgs.includes(DEFAULT_SIGNING_ALG)
            ? DEFAULT_SIGNING_ALG
            : supportedAlgs[0]);
    if (!supportedAlgs.includes(defaultAlg)) {
        throw new Error(
            `defaultAlgorithm '${defaultAlg}' is not among the provider's algorithms (${supportedAlgs.join(", ")})`,
        );
    }
    return { supportedAlgs, defaultAlg };
}

/**
 * Why a KMS provider refuses a key chain that signs with `alg`, or undefined
 * when the provider offers it. `supportedAlgs` is the provider's capability
 * list, already narrowed by `algorithms` in `kms.json`; the same rule holds
 * for key chains the provider creates and for keys imported into it.
 *
 * @param keyRole names the key in the message, for example "new key chains"
 *   or "the imported key"
 */
export function providerAlgRefusal(
    providerId: string,
    supportedAlgs: readonly KmsSigningAlg[],
    alg: KmsSigningAlg,
    keyRole: string,
): string | undefined {
    if (supportedAlgs.includes(alg)) return undefined;
    return `KMS provider '${providerId}' does not offer ${alg} for ${keyRole}. Supported: ${supportedAlgs.join(", ")}`;
}

/**
 * Convert an ASN.1 DER-encoded ECDSA-Sig-Value (`SEQUENCE { r, s }`) to
 * the raw `r || s` representation used by JOSE and COSE.
 */
export function derEcdsaToRaw(
    der: Uint8Array,
    coordinateSize: number,
): Uint8Array {
    let offset = 0;
    const readLength = (): number => {
        let len = der[offset++];
        if (len & 0x80) {
            const lenOfLen = len & 0x7f;
            len = 0;
            for (let i = 0; i < lenOfLen; i++) {
                len = (len << 8) | der[offset++];
            }
        }
        return len;
    };
    if (der[offset++] !== 0x30) {
        throw new Error("Invalid ECDSA signature: missing SEQUENCE tag");
    }
    readLength();

    const readInt = (): Uint8Array => {
        if (der[offset++] !== 0x02) {
            throw new Error("Invalid ECDSA signature: missing INTEGER tag");
        }
        const len = readLength();
        let value = der.subarray(offset, offset + len);
        offset += len;
        // Strip leading zeros used to keep the INTEGER positive.
        while (value.length > coordinateSize && value[0] === 0x00) {
            value = value.subarray(1);
        }
        if (value.length > coordinateSize) {
            throw new Error("Invalid ECDSA signature: integer too long");
        }
        return value;
    };

    const r = readInt();
    const s = readInt();
    const out = new Uint8Array(coordinateSize * 2);
    out.set(r, coordinateSize - r.length);
    out.set(s, coordinateSize * 2 - s.length);
    return out;
}
