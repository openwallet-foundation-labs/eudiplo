import { createPrivateKey, type KeyObject, X509Certificate } from "node:crypto";
import type { KeyChainEntity } from "../../crypto/key/entities/key-chain.entity.js";
import { importedRotationIntervals } from "../../crypto/key/key-chain-import-rotation.js";

type Spec = Record<string, any>;

interface RotationPolicy {
    enabled: boolean;
    intervalDays?: number;
    certValidityDays?: number;
}

interface InternalChainProblem {
    code: string;
    path: string;
    message: string;
}

/**
 * A `private-jwk` key source with `activeJwk` describes an internal chain as
 * stored: `jwk` is the root CA key with its certificate in `crt`, `activeJwk`
 * the signing key with its certificate in `activeCertificate`. Applying it
 * saves both pairs in the database as they are. A private key without
 * `activeJwk` goes through the key chain importer instead.
 */
export function isInternalChainWithPrivateKeys(spec: Spec): boolean {
    return spec.keySource?.type === "private-jwk" && !!spec.keySource.activeJwk;
}

/**
 * The KMS provider that applying a key chain document stores, so the plan
 * and apply agree: an internal chain with private keys always goes into the
 * database.
 */
export function appliedKmsProvider(spec: Spec): string | undefined {
    return isInternalChainWithPrivateKeys(spec) ? "db" : spec.kmsProvider;
}

/** What applying an internal chain with private keys would reject or drop. */
export function internalChainProblems(spec: Spec): InternalChainProblem[] {
    const problems: InternalChainProblem[] = [];
    const problem = (code: string, path: string, message: string) =>
        problems.push({ code, path, message });
    if (spec.kmsProvider !== undefined && spec.kmsProvider !== "db") {
        problem(
            "INVALID_KMS_PROVIDER",
            "/spec/kmsProvider",
            "An internal chain with private keys is stored in the database. Omit kmsProvider or set it to db.",
        );
    }
    const rootKey = privateKey(spec.keySource?.jwk);
    if (!rootKey) {
        problem(
            "INVALID_PRIVATE_KEY",
            "/spec/keySource/jwk",
            "keySource.jwk is not a valid private key.",
        );
    }
    const activeKey = privateKey(spec.keySource?.activeJwk);
    if (!activeKey) {
        problem(
            "INVALID_PRIVATE_KEY",
            "/spec/keySource/activeJwk",
            "keySource.activeJwk is not a valid private key.",
        );
    }
    if (!Array.isArray(spec.crt) || spec.crt.length !== 1) {
        problem(
            "ROOT_CERTIFICATE_REQUIRED",
            "/spec/crt",
            "crt must contain exactly one certificate: the root CA certificate of keySource.jwk.",
        );
    } else {
        const root = certificate(spec.crt[0]);
        if (!root) {
            problem(
                "INVALID_CERTIFICATE",
                "/spec/crt/0",
                "The root CA certificate is not a PEM certificate.",
            );
        } else if (!root.ca) {
            // Rotation signs new signing certificates with the root.
            problem(
                "ROOT_CERTIFICATE_NOT_CA",
                "/spec/crt/0",
                "The root certificate must be a CA certificate (basicConstraints CA=true).",
            );
        } else if (rootKey && !belongsTo(root, rootKey)) {
            problem(
                "CERTIFICATE_KEY_MISMATCH",
                "/spec/crt/0",
                "The root CA certificate does not belong to keySource.jwk.",
            );
        }
    }
    if (!spec.activeCertificate) {
        problem(
            "ACTIVE_CERTIFICATE_REQUIRED",
            "/spec/activeCertificate",
            "activeCertificate is required with keySource.activeJwk.",
        );
    } else {
        const active = certificate(spec.activeCertificate);
        if (!active) {
            problem(
                "INVALID_CERTIFICATE",
                "/spec/activeCertificate",
                "activeCertificate does not start with a PEM certificate.",
            );
        } else if (activeKey && !belongsTo(active, activeKey)) {
            problem(
                "CERTIFICATE_KEY_MISMATCH",
                "/spec/activeCertificate",
                "The first certificate in activeCertificate does not belong to keySource.activeJwk.",
            );
        }
    }
    return problems;
}

function privateKey(jwk: unknown): KeyObject | undefined {
    try {
        return createPrivateKey({ key: jwk as JsonWebKey, format: "jwk" });
    } catch {
        return undefined;
    }
}

/** The first certificate of a PEM value. */
function certificate(value: unknown): X509Certificate | undefined {
    if (typeof value !== "string") return undefined;
    try {
        return new X509Certificate(value);
    } catch {
        return undefined;
    }
}

function belongsTo(certificate: X509Certificate, key: KeyObject): boolean {
    try {
        return certificate.checkPrivateKey(key);
    } catch {
        return false;
    }
}

/**
 * Null in a rotation value means the same as leaving it out. Earlier exports
 * wrote null for unset values; the legacy importer schema accepts only
 * omitted ones.
 */
export function withoutNullRotationValues(spec: Spec): Spec {
    if (!spec.rotationPolicy || typeof spec.rotationPolicy !== "object")
        return spec;
    const rotationPolicy = { ...spec.rotationPolicy };
    for (const key of ["intervalDays", "certValidityDays"])
        if (rotationPolicy[key] === null) delete rotationPolicy[key];
    return { ...spec, rotationPolicy };
}

/**
 * The rotation policy that applying a key chain document stores, so the plan
 * and the importers agree. The document replaces the stored policy: a value
 * it leaves out or sets to null is not set, and without a policy rotation is
 * off. A private key without `activeJwk` goes through the key chain importer,
 * which keeps the intervals only with rotation and then fills in its defaults.
 */
export function appliedRotationPolicy(spec: Spec): RotationPolicy {
    const policy = spec.rotationPolicy ?? {};
    const enabled: boolean = policy.enabled ?? false;
    const intervalDays = policy.intervalDays ?? undefined;
    const certValidityDays = policy.certValidityDays ?? undefined;
    if (
        spec.keySource?.type !== "private-jwk" ||
        isInternalChainWithPrivateKeys(spec)
    )
        return { enabled, intervalDays, certValidityDays };
    if (!enabled) return { enabled };
    return { enabled, ...importedRotationIntervals(policy) };
}

/**
 * The columns besides key material that a key chain document replaces. An
 * unset value is null, which clears the column on save; the entity types
 * these nullable columns without null.
 */
export function keyChainSettingsColumns(
    spec: Spec,
): Pick<
    KeyChainEntity,
    | "description"
    | "rotationEnabled"
    | "rotationIntervalDays"
    | "certValidityDays"
> {
    const policy = appliedRotationPolicy(spec);
    return {
        description: spec.description ?? null,
        rotationEnabled: policy.enabled,
        rotationIntervalDays: policy.intervalDays ?? (null as any),
        certValidityDays: policy.certValidityDays ?? (null as any),
    };
}

/** The spec of those columns, for exports and plans; unset values are left out. */
export function keyChainSettingsSpec(keyChain: KeyChainEntity) {
    return {
        description: keyChain.description ?? undefined,
        rotationPolicy: {
            enabled: keyChain.rotationEnabled,
            intervalDays: keyChain.rotationIntervalDays ?? undefined,
            certValidityDays: keyChain.certValidityDays ?? undefined,
        },
    };
}
